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
import { usable } from "./delivery.js";
import { countFilledPauses } from "./fluency.js";
import { countSyllablesIn, words as splitWords } from "./syllables.js";
/**
 * How much faster articulation must be than speech before the gap is real.
 *
 * A DECISION in §3's sense, not a finding. The reasoning is that the ratio is
 * exactly `1 / phonationRatio` — articulation divides the same syllables by a
 * smaller time — so 1.35 here is the same statement as "about a quarter of the
 * speaking stretch was silence". Below that the separation is inside the
 * measurement noise of where a threshold put a word boundary.
 */
const HUNTING_RATIO = 1.35;
/** Below this there is not enough speech for a rate to mean anything. */
const MIN_RATE_MS = 4_000;
/** Fewer words than this and the syllable count is a rounding error. */
const MIN_RATE_WORDS = 8;
const round2 = (n) => Math.round(n * 100) / 100;
/**
 * Join one take's signal with one take's words.
 *
 * `text` must be the learner's own words: either what they typed, or a
 * transcript from a recogniser that `evidence.ts` says returns the variety
 * that was SPOKEN. Handing this a translated transcript would compute a real
 * number over somebody else's sentence — see `isFaithfulRendering`, which is
 * the caller's gate and is not re-checked here because this file has no pack.
 */
export function measureSpoken(delivery, text, rule, fillers) {
    const words = splitWords(text);
    const syllableCount = countSyllablesIn(words, rule);
    // The speaking stretch: sound plus the gaps inside it. Not `totalMs` — the
    // silence before somebody starts and after they finish is them finding the
    // button, and dividing by it would report a slower speaker the longer they
    // took to reach for the phone.
    const spanMs = delivery.speechMs + delivery.pauseMs;
    const rateable = spanMs >= MIN_RATE_MS && words.length >= MIN_RATE_WORDS;
    return {
        wordCount: words.length,
        syllableCount,
        filledPauseCount: countFilledPauses(text, fillers),
        speechRate: rateable && spanMs > 0 ? round2(syllableCount / (spanMs / 1000)) : 0,
        articulationRate: rateable && delivery.speechMs > 0 ? round2(syllableCount / (delivery.speechMs / 1000)) : 0,
        wordsPerRun: delivery.runCount > 0 ? round2(words.length / delivery.runCount) : 0,
    };
}
/**
 * Which of the two shapes this take is, if either.
 *
 * `unclear` whenever the take is too small to carry the claim, which is most
 * first takes and is fine. A product that always has a verdict is a product
 * whose verdicts mean nothing.
 */
export function interpretation(delivery, spoken) {
    if (!usable(delivery))
        return "unclear";
    if (spoken.speechRate <= 0 || spoken.articulationRate <= 0)
        return "unclear";
    // No pauses at all is not "even" by luck — it IS even, and the ratio is 1.
    return spoken.articulationRate >= spoken.speechRate * HUNTING_RATIO ? "hunting" : "even";
}
//# sourceMappingURL=spoken.js.map