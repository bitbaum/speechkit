/**
 * Utterance fluency: the measures that need a transcript, and nothing more.
 *
 * `delivery.ts` measures the SIGNAL — where the sound was and
 * where it was not — and stops there, because without words there is nothing
 * to divide by. This file is the other half, and it only becomes available
 * when `evidence.ts` says the transcript is the learner's own words.
 *
 * WHAT "FLUENCY" MEANS HERE. The research sense, not the everyday one: these
 * describe the temporal shape of an utterance — how fast, in how long a run,
 * broken by how many silences. They say nothing about how good somebody
 * sounds, how correct they were, or how near a native speaker they are. That
 * separation is the whole reason these are safe to report: a number that
 * measures speed is honest about speed and makes no claim it cannot support.
 *
 * NO NORMS, ANYWHERE. There is no table here of what a B1 speaker's syllables
 * per second should be, and there will not be one. Such tables exist for some
 * languages and some tasks, and applying one to an adult talking about a topic
 * they chose, on a phone, in a language nobody normed for this, would be the
 * false precision §8 forbids dressed up as scholarship. Every number is
 * reported as itself and compared only against the same learner's own earlier
 * takes.
 *
 * Pure: no I/O, no model, same input -> same output.
 */
import { type SyllableRule } from "./syllables.ts";
/**
 * A word with the time it was said, as a recogniser returns it.
 *
 * Seconds, because that is what every vendor's `verbose_json` uses and
 * converting on the way in is one fewer place to put a factor of a thousand in
 * the wrong direction.
 */
export type TimedWord = {
    word: string;
    /** Seconds from the start of the recording. */
    start: number;
    end: number;
};
/** Re-exported so a caller measuring from the transcript needs one import. */
export { MIN_PAUSE_MS } from "./pause.ts";
export type Fluency = {
    /** Words the recogniser returned. */
    wordCount: number;
    syllableCount: number;
    /** Total span from the first word to the last, in ms. */
    spanMs: number;
    /** Time inside words — the sum of their durations. */
    phonationMs: number;
    /** Time in gaps between words that are long enough to be pauses. */
    pauseMs: number;
    pauseCount: number;
    longestPauseMs: number;
    /**
     * Syllables per second across the whole span, pauses included.
     *
     * The standard "speech rate". It falls when somebody hesitates, which is the
     * point — it is a measure of getting a thought out, not of tongue speed.
     */
    speechRate: number;
    /**
     * Syllables per second of PHONATION, pauses excluded.
     *
     * "Articulation rate". Reported beside the other because the pair is
     * informative in a way neither is alone: equal articulation rates with
     * different speech rates is a person who has the words and is hunting for
     * them, which is a different problem from one who has neither.
     */
    articulationRate: number;
    /** Mean syllables in an unbroken run between pauses. */
    meanLengthOfRun: number;
    /** How many runs there were. */
    runCount: number;
};
/**
 * Measure an utterance from its timed words.
 *
 * Words with impossible timings are dropped rather than trusted: a recogniser
 * occasionally returns an end before its start, or two words claiming the same
 * instant, and a negative duration propagates into every rate below it as a
 * number that looks measured.
 */
export declare function measureFluency(timed: readonly TimedWord[], rule: SyllableRule): Fluency;
/**
 * Filled pauses — `äh`, `ähm`, `öh`.
 *
 * A separate measure from silent pauses because they are a different
 * behaviour: a silent pause is a person thinking, a filled one is a person
 * holding the floor while they think. Both are NORMAL — native speakers
 * produce them constantly, and a product that treats them as errors is
 * teaching somebody to sound like a written document.
 *
 * So this counts and never judges. The list is per-language and comes from the
 * pack; nothing in this file knows what German hesitates with.
 */
export declare function countFilledPauses(text: string, fillers: readonly string[]): number;
//# sourceMappingURL=fluency.d.ts.map