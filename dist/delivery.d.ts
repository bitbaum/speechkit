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
import { type PauseSpan } from "./pause.ts";
/** Below this there is not enough recording to say anything about it. */
export declare const MIN_USEFUL_MS = 3000;
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
/**
 * Measure one recording.
 *
 * `samples` is mono, -1..1, as `AudioBuffer.getChannelData` hands it over.
 * Everything is derived in the browser and only the RESULT is ever sent
 * anywhere — see `takes` in db/schema.ts for why the audio itself is not.
 */
export declare function measure(samples: Float32Array, sampleRate: number): Delivery;
/**
 * Is there enough here to say anything at all?
 *
 * The caller asks before showing measurements, so a two-second false start
 * produces "record a bit more" rather than a confident page of numbers about
 * nothing. `too-quiet` counts as unusable for the same reason: the threshold
 * has no signal to find.
 */
export declare function usable(delivery: Delivery): boolean;
//# sourceMappingURL=delivery.d.ts.map