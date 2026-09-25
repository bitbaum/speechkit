import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_PAUSE_MS, countFilledPauses, measureFluency, type TimedWord } from "./fluency.ts";
import type { SyllableRule } from "./syllables.ts";

const GERMAN: SyllableRule = { vowels: "aeiouäöüy", adjacentVowelsMerge: true };
const FILLERS = ["äh", "ähm", "öh", "ehm", "hm"];

/**
 * Timings are built rather than recorded, so the expected answer is arithmetic
 * a reader can check instead of a number this file printed once.
 *
 * `at` places a word at a start time with a duration, both in seconds.
 */
const at = (word: string, start: number, duration: number): TimedWord => ({
  word,
  start,
  end: start + duration,
});

test("nothing in, nothing claimed", () => {
  const f = measureFluency([], GERMAN);
  assert.equal(f.wordCount, 0);
  assert.equal(f.speechRate, 0);
  assert.equal(f.meanLengthOfRun, 0);
});

test("an unbroken utterance has one run and no pauses", () => {
  // Four words, back to back, 0.5s each: 2 seconds, 6 syllables.
  // Gu-ten(2) Tag(1) Wie(1) gehts(1) = 5... spelled out below.
  const timed = [
    at("Guten", 0, 0.5),
    at("Tag", 0.5, 0.5),
    at("wie", 1.0, 0.5),
    at("gehts", 1.5, 0.5),
  ];
  const f = measureFluency(timed, GERMAN);
  assert.equal(f.wordCount, 4);
  assert.equal(f.syllableCount, 5, "Gu-ten Tag wie gehts");
  assert.equal(f.pauseCount, 0);
  assert.equal(f.runCount, 1);
  assert.equal(f.spanMs, 2000);
  assert.equal(f.speechRate, 2.5, "5 syllables in 2 seconds");
  assert.equal(f.articulationRate, 2.5, "no pauses, so the two rates agree");
  assert.equal(f.meanLengthOfRun, 5);
});

test("a gap long enough to be a pause splits the run and slows the speech rate", () => {
  // Two syllables, one second of speech, then a 1s pause, then two more.
  const timed = [at("Guten", 0, 1), at("Tag", 2, 1)];
  const f = measureFluency(timed, GERMAN);
  assert.equal(f.pauseCount, 1);
  assert.equal(f.longestPauseMs, 1000);
  assert.equal(f.runCount, 2);
  assert.equal(f.spanMs, 3000);
  assert.equal(f.syllableCount, 3, "Gu-ten Tag");
  assert.equal(f.speechRate, 1, "3 syllables across 3 seconds, pause included");
  assert.equal(f.articulationRate, 1.5, "3 syllables across 2 seconds of phonation");
  assert.ok(f.articulationRate > f.speechRate, "the pause is what separates them");
});

/**
 * The pair is the point: two speakers can articulate at the same speed and
 * differ entirely in how much they hesitate, and one number cannot show that.
 */
test("articulation rate and speech rate say different things", () => {
  const fluent = [at("Guten", 0, 0.5), at("Tag", 0.5, 0.5)];
  const hesitant = [at("Guten", 0, 0.5), at("Tag", 2.0, 0.5)];

  const a = measureFluency(fluent, GERMAN);
  const b = measureFluency(hesitant, GERMAN);

  assert.equal(a.articulationRate, b.articulationRate, "the same tongue speed");
  assert.ok(b.speechRate < a.speechRate, "and a very different time to get it out");
});

test("a gap shorter than a pause is a consonant, not a hesitation", () => {
  const justUnder = (MIN_PAUSE_MS - 50) / 1000;
  const timed = [at("Guten", 0, 0.5), at("Tag", 0.5 + justUnder, 0.5)];
  const f = measureFluency(timed, GERMAN);
  assert.equal(f.pauseCount, 0);
  assert.equal(f.runCount, 1, "and the run is not broken by it");
});

test("silence before the first word and after the last is not hesitation", () => {
  // The recording may be ten seconds long; the utterance starts when the
  // first word does. Span is measured between words, so leaving the recorder
  // running does not read as a pause.
  const timed = [at("Hallo", 5, 0.5), at("zäme", 5.5, 0.5)];
  const f = measureFluency(timed, GERMAN);
  assert.equal(f.spanMs, 1000);
  assert.equal(f.pauseCount, 0);
});

test("impossible timings are dropped rather than propagated as measured numbers", () => {
  const timed: TimedWord[] = [
    at("Guten", 0, 0.5),
    { word: "kaputt", start: 2, end: 1 }, // ends before it starts
    { word: "", start: 3, end: 3.5 }, // no word at all
    { word: "NaN", start: Number.NaN, end: 1 },
    at("Tag", 1, 0.5),
  ];
  const f = measureFluency(timed, GERMAN);
  assert.equal(f.wordCount, 2, "only the two real words survive");
  assert.ok(f.phonationMs > 0 && Number.isFinite(f.speechRate));
  assert.ok(f.speechRate > 0);
});

test("words arriving out of order are sorted, not believed", () => {
  // Back to back once sorted, so a reader can see that the ordering is what is
  // under test rather than the gap. Reading them as given would compute a
  // negative gap between `Tag` and `Guten` and call it a pause.
  const timed = [at("Tag", 0.5, 0.5), at("Guten", 0, 0.5)];
  const f = measureFluency(timed, GERMAN);
  assert.equal(f.spanMs, 1000);
  assert.equal(f.pauseCount, 0, "a negative gap is not a pause");
  assert.equal(f.runCount, 1);
});

/**
 * Filled pauses are counted and never judged. Native speakers produce them
 * constantly; a product that flags them teaches somebody to sound like a
 * written document.
 */
test("filled pauses are counted, and the list is the language's not the engine's", () => {
  assert.equal(countFilledPauses("äh ich hätte ähm gern einen Termin", FILLERS), 2);
  assert.equal(countFilledPauses("ich hätte gern einen Termin", FILLERS), 0);
  // With no list, nothing is a filler — the engine knows no language.
  assert.equal(countFilledPauses("äh ich hätte ähm gern", []), 0);
});

test("a filler is only a filler as a whole word", () => {
  // `ähnlich` starts with `äh` and is an ordinary word.
  assert.equal(countFilledPauses("das isch ähnlich", FILLERS), 0);
});
