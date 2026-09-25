/**
 * The two halves of one take, joined: what the SIGNAL said and what the WORDS
 * said.
 *
 * WHY THIS FILE EXISTS. `delivery.ts` measures where the sound
 * was. `speech/fluency.ts` measures the temporal shape of a transcript. Both
 * were written, both are tested, and until now nothing called the second one:
 * `grep` for it found `capability.ts` naming its path in a string and no other
 * importer in the app. So the product shipped durations and a count of gaps,
 * and the learner was told how many times they stopped without ever being told
 * how much they got said in between. That is the half of the exercise that
 * makes the other half mean something.
 *
 * WHY NOT `measureFluency` DIRECTLY. It takes `TimedWord[]` — a word with a
 * start and an end — and the transcription chain this product actually has
 * returns `response_format: "json"`, which is text and no timings. Two ways
 * out, and only one is honest:
 *
 *   - ask the vendor for `verbose_json` and use per-word times. That means an
 *     ai-kit change, in another repo, for a shape one caller wants.
 *   - take the DURATIONS from the signal, which are already measured on the
 *     device and more trustworthy than a recogniser's alignment anyway, and
 *     take the COUNTS from the text.
 *
 * The second is what this file does, and it is not a workaround: the audio is
 * the better source for time, and the transcript is the only source for
 * syllables. `measureFluency` stays exactly as it is, for the day a pack has
 * word timings and wants per-word gaps; the pause definitions agree because
 * both sides read `pause.ts`.
 *
 * WHAT THIS STILL REFUSES TO SAY is everything §8 refuses. There is no rate
 * here that is compared with a norm, because no norm exists for an adult
 * talking about a topic they chose, on a phone, in this language. The numbers
 * are reported as themselves and compared only with the same learner's own
 * earlier takes — see `interpretation`, which names a SHAPE rather than a
 * grade, and says nothing at all when the two rates do not separate.
 *
 * Pure: no I/O, no model, same input -> same output.
 */
import type { Delivery } from "./delivery.ts";
import { type SyllableRule } from "./syllables.ts";
export type Spoken = {
    wordCount: number;
    syllableCount: number;
    /** `äh`, `ähm`, `hm` — counted, never judged. See `fluency.ts`. */
    filledPauseCount: number;
    /**
     * Syllables per second across the speaking stretch, pauses INCLUDED.
     *
     * The standard "speech rate". It falls when somebody hesitates, which is the
     * point — it measures getting a thought out, not tongue speed.
     */
    speechRate: number;
    /**
     * Syllables per second of phonation, pauses EXCLUDED. "Articulation rate".
     *
     * Reported beside the other because the PAIR is the informative thing and
     * neither is alone. See `interpretation`.
     */
    articulationRate: number;
    /** Mean words in an unbroken run between pauses. */
    wordsPerRun: number;
};
/**
 * What the pair of rates is shaped like.
 *
 * `hunting`  — the words come out quickly once they come, and the whole
 *              stretch is slow. The vocabulary is there and the retrieval is
 *              not. Practising the SAME topic again is the intervention that
 *              matches this, and it is the one the product can offer.
 * `even`     — the two rates are close: few pauses, and the speed is the speed
 *              of speaking rather than of thinking.
 * `unclear`  — there is not enough separation, or not enough take, to say. A
 *              real answer, and the default.
 *
 * DELIBERATELY NOT "good" AND "bad". A hunting shape is what every learner
 * sounds like on a topic they have not said out loud before, and an even shape
 * on a memorised sentence is not an achievement. The shape is a fact about one
 * recording that suggests what to do next; it is not a placement.
 */
export type Shape = "hunting" | "even" | "unclear";
/**
 * Join one take's signal with one take's words.
 *
 * `text` must be the learner's own words: either what they typed, or a
 * transcript from a recogniser that `evidence.ts` says returns the variety
 * that was SPOKEN. Handing this a translated transcript would compute a real
 * number over somebody else's sentence — see `isFaithfulRendering`, which is
 * the caller's gate and is not re-checked here because this file has no pack.
 */
export declare function measureSpoken(delivery: Delivery, text: string, rule: SyllableRule, fillers: readonly string[]): Spoken;
/**
 * Which of the two shapes this take is, if either.
 *
 * `unclear` whenever the take is too small to carry the claim, which is most
 * first takes and is fine. A product that always has a verdict is a product
 * whose verdicts mean nothing.
 */
export declare function interpretation(delivery: Delivery, spoken: Spoken): Shape;
//# sourceMappingURL=spoken.d.ts.map