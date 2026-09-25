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
export { measure as measureDelivery, usable, MIN_USEFUL_MS } from "./delivery.ts";
export type { Delivery, RecordingProblem } from "./delivery.ts";
export { MIN_PAUSE_MS, SEARCH_PAUSE_MS, STUCK_PAUSE_MS } from "./pause.ts";
export type { PauseSpan } from "./pause.ts";
export { evidenceFrom, mayJudgeForm, isFaithfulRendering, FORM_JUDGEMENT_MAX_WER, } from "./evidence.ts";
export type { Recognition, EvidenceKind } from "./evidence.ts";
export { countSyllables, countSyllablesIn, words as splitWords } from "./syllables.ts";
export type { SyllableRule } from "./syllables.ts";
export { measureFluency, countFilledPauses } from "./fluency.ts";
export type { TimedWord, Fluency } from "./fluency.ts";
export { measureSpoken, interpretation } from "./spoken.ts";
export type { Spoken, Shape } from "./spoken.ts";
export { hesitations, MAX_HESITATIONS } from "./hesitation.ts";
export type { Hesitation } from "./hesitation.ts";
export { markerVerdict, returnsSpokenVariety } from "./dialect-marker.ts";
export type { MarkerVerdict, VarietyMarkers } from "./dialect-marker.ts";
export { NATION_LADDER, POCKET_LADDER, isLadder, trajectory, nextLimit } from "./repetition.ts";
export type { Attempt, Trajectory, Trend } from "./repetition.ts";
export { fromLanguageTool, worthShowing, SPOKEN_CATEGORIES, SPOKEN_EXEMPT_RULES, MAX_SHOWN, } from "./grammar.ts";
export type { GrammarFinding } from "./grammar.ts";
export { checkGrammar } from "./languagetool.ts";
export type { GrammarCheck } from "./languagetool.ts";
//# sourceMappingURL=index.d.ts.map