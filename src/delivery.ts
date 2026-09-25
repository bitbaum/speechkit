/**
 * What can honestly be measured from a recording of somebody speaking, with
 * no model, no transcript and no opinion.
 *
 * THIS FILE EXISTS BECAUSE OF §8.
 *
 * The obvious build for "AI evaluates your speaking" is a pronunciation score:
 * upload the audio, get back 87% native. The overclaim register bans it by
 * name — "93% native pronunciation. Speech-score theatre; false precision" —
 * and §7 says why it would be worse here than elsewhere. Swiss German ASR is
 * unsolved; the honest published figure is ~25.6% WER after fine-tuning on
 * 1,367 hours, and the state of the art transcribes dialect INTO Standard
 * German, translating away the exact thing being learned. A score computed on
 * top of that is a number with nothing underneath it, handed to the one person
 * who cannot check it, about the one thing they came here not knowing.
 *
 * So this measures the SIGNAL and says only what the signal says. Every number
 * below is arithmetic over the samples: how long there was sound, where the
 * gaps were, how long the longest one was, whether the microphone clipped.
 * Reproducible, checkable by anyone with the same audio, and true whatever
 * language was spoken — which is also why it works for a Lesya deployment
 * unchanged. Nothing here knows what a phoneme is.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *
 *  - No score, no grade, no percentage of anything. `Delivery` carries counts
 *    and durations; there is a test asserting no field is a rating.
 *  - No speech RATE. Syllables per second is the standard fluency measure and
 *    it needs a transcript to count syllables. We do not have a trustworthy
 *    one, so the measure is absent rather than estimated. Mean run LENGTH is
 *    reported instead, in milliseconds, which is measurable without words.
 *  - No claim that any of this means proficiency. It describes one recording.
 *    The learner compares it with their own earlier ones; that is a fact about
 *    two recordings, not a placement on a scale nobody validated here.
 *
 * Pure: no I/O, no model, same input -> same output.
 */

/** 20 ms frames. Short enough to catch a stop closure, long enough for a stable RMS. */
const FRAME_MS = 20;

/**
 * The gap that counts as a pause — the SAME definition the transcript half
 * uses, imported rather than copied.
 *
 * `fluency.ts` measures pauses from the words a recogniser returned
 * and this file measures them from the signal. Two thresholds would make the
 * product report a different number of pauses for one recording depending on
 * which half answered, with nothing failing: both internally consistent and
 * quietly disagreeing. See `pause.ts` for the phonetic reason the
 * number is 250.
 */
import { MIN_PAUSE_MS, type PauseSpan } from "./pause.ts";

/** A blip shorter than this is a click or a breath, not a run of speech. */
const MIN_RUN_MS = 120;

/** Below this there is not enough recording to say anything about it. */
export const MIN_USEFUL_MS = 3_000;

/** How far above the room tone a frame must sit to count as sound. */
const VOICE_MARGIN_DB = 10;

/** How far below the loudest speech the threshold may sit at most. */
const PEAK_DROP_DB = 25;

/** A hard floor, so a recording made in a soundproof room is not all speech. */
const ABSOLUTE_FLOOR_DB = -60;

/** Above this the peak is real speech rather than somebody's fan. */
const AUDIBLE_PEAK_DB = -45;

/** Samples this close to the ceiling are being cut off by the converter. */
const CLIP_LEVEL = 0.985;

/** Clipping below this fraction is a stray consonant, not a mic problem. */
const CLIP_RATIO_REPORTABLE = 0.005;

/**
 * Things wrong with the RECORDING, which are not things wrong with the person.
 *
 * Separated from the measurements on purpose. "You paused a lot" and "your
 * microphone was clipping" are different sentences with different fixes, and
 * a product that mixes them tells someone to speak more confidently when what
 * they actually need is to sit further from the laptop.
 */
export type RecordingProblem = "too-short" | "too-quiet" | "clipped";

export type Delivery = {
  /** Length of the recording. */
  totalMs: number;
  /** Time with sound in it. */
  speechMs: number;
  /** Time in gaps BETWEEN runs of speech. Leading and trailing silence is not a pause. */
  pauseMs: number;
  pauseCount: number;
  longestPauseMs: number;
  runCount: number;
  /**
   * Mean length of an unbroken run of speech.
   *
   * The closest honest neighbour of "mean length of run", which is normally
   * counted in syllables and cannot be here — see the header. Milliseconds
   * are what the signal actually offers.
   */
  meanRunMs: number;
  /**
   * speechMs / (speechMs + pauseMs), 0..1. How much of the speaking stretch
   * had sound in it. Zero when nothing was said.
   */
  phonationRatio: number;
  /** Fraction of samples at the ceiling. A microphone fact, not a speaking one. */
  clippedRatio: number;
  problems: RecordingProblem[];
  /**
   * Where each pause was, in ms from the start of the recording.
   *
   * The counts above say HOW MUCH hesitation there was; this says WHERE, so a
   * transcript's word timings can name the word that followed. Measured here
   * rather than taken from the recogniser, because recognisers are poor
   * clocks for silence: Whisper was observed stretching a one-syllable word
   * across a 1.8 s pause, leaving no gap between words at all.
   *
   * Optional and never persisted: `take.ts` decodes only the numeric fields,
   * so a stored take keeps no timeline — it is only needed while the take is
   * on screen.
   */
  pauseSpans?: PauseSpan[];
};

/** Frame RMS in dBFS, floored so silence is a number rather than -Infinity. */
function frameDb(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / Math.max(1, to - from));
  return rms > 0 ? Math.max(-120, 20 * Math.log10(rms)) : -120;
}

/** Nearest-rank percentile over a copy, so the caller's array is untouched. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return -120;
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((p / 100) * (sorted.length - 1))),
  );
  return sorted[rank];
}

/**
 * Where the threshold between sound and room goes.
 *
 * Two candidates, and we take the LOWER of them — which means being generous
 * about what counts as speech, and therefore CONSERVATIVE about what counts as
 * a pause. That direction is deliberate. The feedback this feeds says things
 * like "you stopped four times"; a pause we missed costs a learner nothing,
 * and a pause we invented is the product telling somebody they hesitated when
 * they did not. Between a measure that flatters and a measure that accuses,
 * the honest failure is the one that flatters.
 *
 *   floor + margin   works when there is real room tone to sit above.
 *   peak - drop      works when the recording is wall-to-wall speech and the
 *                    10th percentile is itself a quiet vowel.
 */
function voiceThresholdDb(floorDb: number, peakDb: number): number {
  return Math.max(ABSOLUTE_FLOOR_DB, Math.min(floorDb + VOICE_MARGIN_DB, peakDb - PEAK_DROP_DB));
}

/**
 * Turn gaps shorter than a real pause back into speech, in place.
 *
 * The silence inside a `t` is tens of milliseconds and belongs to the word.
 * A gap that runs off either END of the recording is left alone: that is the
 * person finding the button, and joining it to the speech would put their
 * fumbling inside their own run length.
 */
function bridgeShortGaps(voiced: boolean[]): void {
  const minPauseFrames = Math.max(1, Math.round(MIN_PAUSE_MS / FRAME_MS));
  let gapStart = -1;
  for (let f = 0; f <= voiced.length; f++) {
    const isVoiced = f < voiced.length ? voiced[f] : true;
    if (!isVoiced) {
      if (gapStart === -1) gapStart = f;
      continue;
    }
    if (gapStart !== -1) {
      if (f - gapStart < minPauseFrames && gapStart > 0 && f < voiced.length) {
        for (let g = gapStart; g < f; g++) voiced[g] = true;
      }
      gapStart = -1;
    }
  }
}

/**
 * Turn runs too short to be speech back into silence, in place.
 *
 * Run AFTER bridging, never before: a blip, a 200 ms gap and another blip is
 * one 400 ms run of somebody starting a word, and dropping the blips first
 * would delete it. Bridging first, then dropping, keeps that and still merges
 * the two silences around a genuine isolated click.
 */
function unvoiceShortRuns(voiced: boolean[]): void {
  const minRunFrames = Math.max(1, Math.round(MIN_RUN_MS / FRAME_MS));
  let runStart = -1;
  for (let f = 0; f <= voiced.length; f++) {
    const isVoiced = f < voiced.length ? voiced[f] : false;
    if (isVoiced) {
      if (runStart === -1) runStart = f;
      continue;
    }
    if (runStart !== -1) {
      if (f - runStart < minRunFrames) {
        for (let r = runStart; r < f; r++) voiced[r] = false;
      }
      runStart = -1;
    }
  }
}

/**
 * Measure one recording.
 *
 * `samples` is mono, -1..1, as `AudioBuffer.getChannelData` hands it over.
 * Everything is derived in the browser and only the RESULT is ever sent
 * anywhere — see `takes` in db/schema.ts for why the audio itself is not.
 */
export function measure(samples: Float32Array, sampleRate: number): Delivery {
  const empty: Delivery = {
    totalMs: 0,
    speechMs: 0,
    pauseMs: 0,
    pauseCount: 0,
    longestPauseMs: 0,
    runCount: 0,
    meanRunMs: 0,
    phonationRatio: 0,
    clippedRatio: 0,
    problems: ["too-short"],
  };
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samples.length === 0) return empty;

  const totalMs = Math.round((samples.length / sampleRate) * 1000);
  const frameLength = Math.max(1, Math.round((FRAME_MS / 1000) * sampleRate));
  const frameCount = Math.floor(samples.length / frameLength);
  if (frameCount === 0) return { ...empty, totalMs };

  const db: number[] = new Array(frameCount);
  let clipped = 0;
  for (let f = 0; f < frameCount; f++) {
    const from = f * frameLength;
    db[f] = frameDb(samples, from, from + frameLength);
  }
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= CLIP_LEVEL) clipped++;
  }
  const clippedRatio = clipped / samples.length;

  const sorted = [...db].sort((a, b) => a - b);
  const floorDb = percentile(sorted, 10);
  const peakDb = percentile(sorted, 90);
  const threshold = voiceThresholdDb(floorDb, peakDb);

  const problems: RecordingProblem[] = [];
  if (totalMs < MIN_USEFUL_MS) problems.push("too-short");
  if (peakDb < AUDIBLE_PEAK_DB) problems.push("too-quiet");
  if (clippedRatio >= CLIP_RATIO_REPORTABLE) problems.push("clipped");

  // Nothing loud enough to be anybody's voice. Reporting zero pauses and a
  // zero ratio here would be arithmetically true and read as a verdict, so the
  // caller gets the problem and no measurements to misread.
  if (peakDb < AUDIBLE_PEAK_DB) {
    return { ...empty, totalMs, clippedRatio, problems };
  }

  const voiced = db.map((value) => value >= threshold);

  // Bridge gaps shorter than a real pause, so a stop closure does not end a
  // run. Done before runs are counted, or every plosive becomes a hesitation.
  bridgeShortGaps(voiced);

  // Then drop the blips — and this order is the whole correction.
  //
  // A cough, a lip smack or a breath inside a long silence is a voiced frame
  // or two. It is not a run, so it was already discarded from `speechMs`. But
  // the OLD loop discarded it only at the point of measuring runs, while still
  // treating it as the end of the gap before it and the start of the gap
  // after — so one silence of 1.9 s came back as TWO pauses of 0.9 s. Both
  // symptoms at once: the count inflated, the longest pause understated, and
  // `pauseCount` free to exceed `runCount`, which is arithmetically impossible
  // for gaps that by definition sit between runs.
  //
  // Measured on a real take from the live site (2026-09-20): 16 s of speech
  // reported with 14 pauses and a mean run of 1.5 s — more gaps than there
  // were runs to put them between. Unsilencing the blips here means the two
  // silences either side simply ARE one silence, which is what a person
  // listening would say.
  unvoiceShortRuns(voiced);

  // Runs of sound, and the gaps between them. Leading and trailing silence is
  // the person finding the button, not a hesitation, so only gaps with speech
  // on BOTH sides are counted.
  //
  // After the two passes above every surviving run is >= MIN_RUN_MS and every
  // surviving interior gap is >= MIN_PAUSE_MS, so this is a plain alternation
  // and `pauses.length === max(0, runs.length - 1)` holds by construction.
  // `delivery.test.ts` asserts it rather than trusting this paragraph.
  const runs: number[] = [];
  const pauses: number[] = [];
  const pauseSpans: PauseSpan[] = [];
  let runFrames = 0;
  let gapFrames = 0;
  for (let f = 0; f < voiced.length; f++) {
    if (voiced[f]) {
      if (runFrames === 0 && runs.length > 0) {
        pauses.push(gapFrames * FRAME_MS);
        pauseSpans.push({ startMs: (f - gapFrames) * FRAME_MS, endMs: f * FRAME_MS });
      }
      runFrames++;
      gapFrames = 0;
      continue;
    }
    if (runFrames > 0) {
      runs.push(runFrames * FRAME_MS);
      runFrames = 0;
    }
    gapFrames++;
  }
  if (runFrames > 0) runs.push(runFrames * FRAME_MS);

  const speechMs = runs.reduce((a, b) => a + b, 0);
  const pauseMs = pauses.reduce((a, b) => a + b, 0);
  const spoken = speechMs + pauseMs;

  return {
    totalMs,
    speechMs,
    pauseMs,
    pauseCount: pauses.length,
    longestPauseMs: pauses.length > 0 ? Math.max(...pauses) : 0,
    runCount: runs.length,
    meanRunMs: runs.length > 0 ? Math.round(speechMs / runs.length) : 0,
    phonationRatio: spoken > 0 ? speechMs / spoken : 0,
    clippedRatio,
    problems,
    pauseSpans,
  };
}

/**
 * Is there enough here to say anything at all?
 *
 * The caller asks before showing measurements, so a two-second false start
 * produces "record a bit more" rather than a confident page of numbers about
 * nothing. `too-quiet` counts as unusable for the same reason: the threshold
 * has no signal to find.
 */
export function usable(delivery: Delivery): boolean {
  return !delivery.problems.includes("too-short") && !delivery.problems.includes("too-quiet");
}
