/**
 * speechkit — measure how somebody spoke, and say only what the evidence allows.
 *
 * Language-agnostic by construction: every fact about a language (vowels,
 * filler words, dialect markers, a grammar-checker code) is passed IN by the
 * caller, usually from a language pack. Nothing in this package names one.
 *
 * Four layers, from least evidence to most:
 *
 *   signal      `measureDelivery` — pauses, runs, phonation, from raw samples.
 *               Needs no transcript, so it works for a dialect nothing can
 *               write down.
 *   evidence    `evidenceFrom` / `mayJudgeForm` — the rule that decides what a
 *               transcript may be evidence OF. A recogniser that translates
 *               (dialect in, standard out) yields "meaning-only", never
 *               "words", at any error rate.
 *   words       `measureSpoken` (rate, articulation, run length), `hesitations`
 *               (which word a long pause preceded), `markerVerdict` (did the
 *               recogniser answer in the variety spoken?).
 *   grammar     `checkGrammar` against your own LanguageTool, filtered to what a
 *               SPEAKER is answerable for — never spelling, casing or
 *               punctuation, which the recogniser decided.
 *
 * And one thing it refuses: there is no pronunciation score, and there will
 * not be one. A score against a native ideal is a judgement about a person,
 * and no improvement in recognition makes it honest.
 */
// signal
export { measure as measureDelivery, usable, MIN_USEFUL_MS } from "./delivery.js";
export { MIN_PAUSE_MS, SEARCH_PAUSE_MS, STUCK_PAUSE_MS } from "./pause.js";
// evidence
export { evidenceFrom, mayJudgeForm, isFaithfulRendering, FORM_JUDGEMENT_MAX_WER, } from "./evidence.js";
// words
export { countSyllables, countSyllablesIn, words as splitWords } from "./syllables.js";
export { measureFluency, countFilledPauses } from "./fluency.js";
export { measureSpoken, interpretation } from "./spoken.js";
export { hesitations, MAX_HESITATIONS } from "./hesitation.js";
export { markerVerdict, returnsSpokenVariety } from "./dialect-marker.js";
// practice design
export { NATION_LADDER, POCKET_LADDER, isLadder, trajectory, nextLimit } from "./repetition.js";
// grammar
export { fromLanguageTool, worthShowing, SPOKEN_CATEGORIES, SPOKEN_EXEMPT_RULES, MAX_SHOWN, } from "./grammar.js";
export { checkGrammar } from "./languagetool.js";
//# sourceMappingURL=index.js.map