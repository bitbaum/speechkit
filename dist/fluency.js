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
import { countSyllables, words as splitWords } from "./syllables.js";
import { MIN_PAUSE_MS } from "./pause.js";
/** Re-exported so a caller measuring from the transcript needs one import. */
export { MIN_PAUSE_MS } from "./pause.js";
const EMPTY = {
    wordCount: 0,
    syllableCount: 0,
    spanMs: 0,
    phonationMs: 0,
    pauseMs: 0,
    pauseCount: 0,
    longestPauseMs: 0,
    speechRate: 0,
    articulationRate: 0,
    meanLengthOfRun: 0,
    runCount: 0,
};
const round2 = (n) => Math.round(n * 100) / 100;
/**
 * Measure an utterance from its timed words.
 *
 * Words with impossible timings are dropped rather than trusted: a recogniser
 * occasionally returns an end before its start, or two words claiming the same
 * instant, and a negative duration propagates into every rate below it as a
 * number that looks measured.
 */
export function measureFluency(timed, rule) {
    const usable = timed
        .filter((w) => Number.isFinite(w.start) &&
        Number.isFinite(w.end) &&
        w.end >= w.start &&
        w.word.trim().length > 0)
        .slice()
        .sort((a, b) => a.start - b.start);
    if (usable.length === 0)
        return EMPTY;
    let syllableCount = 0;
    let phonationMs = 0;
    for (const w of usable) {
        syllableCount += countSyllables(w.word, rule);
        phonationMs += (w.end - w.start) * 1000;
    }
    const spanMs = (usable[usable.length - 1].end - usable[0].start) * 1000;
    // Pauses are the gaps BETWEEN words. Silence before the first word and after
    // the last is the person finding the button, not hesitation — the same rule
    // the signal half applies, for the same reason.
    const pauses = [];
    const runs = [];
    let runSyllables = countSyllables(usable[0].word, rule);
    for (let i = 1; i < usable.length; i++) {
        const gapMs = (usable[i].start - usable[i - 1].end) * 1000;
        if (gapMs >= MIN_PAUSE_MS) {
            pauses.push(gapMs);
            runs.push(runSyllables);
            runSyllables = 0;
        }
        runSyllables += countSyllables(usable[i].word, rule);
    }
    runs.push(runSyllables);
    const pauseMs = pauses.reduce((a, b) => a + b, 0);
    const spanSeconds = spanMs / 1000;
    const phonationSeconds = phonationMs / 1000;
    return {
        wordCount: usable.length,
        syllableCount,
        spanMs: Math.round(spanMs),
        phonationMs: Math.round(phonationMs),
        pauseMs: Math.round(pauseMs),
        pauseCount: pauses.length,
        longestPauseMs: pauses.length > 0 ? Math.round(Math.max(...pauses)) : 0,
        speechRate: spanSeconds > 0 ? round2(syllableCount / spanSeconds) : 0,
        articulationRate: phonationSeconds > 0 ? round2(syllableCount / phonationSeconds) : 0,
        meanLengthOfRun: runs.length > 0 ? round2(syllableCount / runs.length) : 0,
        runCount: runs.length,
    };
}
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
export function countFilledPauses(text, fillers) {
    if (fillers.length === 0)
        return 0;
    const set = new Set(fillers.map((f) => f.toLowerCase()));
    let count = 0;
    for (const word of splitWords(text)) {
        if (set.has(word.toLowerCase()))
            count++;
    }
    return count;
}
//# sourceMappingURL=fluency.js.map