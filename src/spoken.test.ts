import { test } from "node:test";
import assert from "node:assert/strict";
import { measureSpoken, interpretation, type Spoken } from "./spoken.ts";
import type { Delivery } from "./delivery.ts";

/** German, as `packs/gsw-zh.ts` declares it. */
const RULE = { vowels: "aeiouäöüy", adjacentVowelsMerge: true };
const FILLERS = ["äh", "ähm", "öh", "ehm", "hm", "mhm"];

function delivery(over: Partial<Delivery> = {}): Delivery {
  return {
    totalMs: 20_000,
    speechMs: 12_000,
    pauseMs: 4_000,
    pauseCount: 3,
    longestPauseMs: 2_000,
    runCount: 4,
    meanRunMs: 3_000,
    phonationRatio: 0.75,
    clippedRatio: 0,
    problems: [],
    ...over,
  };
}

/** Enough words that the rate gate opens. */
const SENTENCE =
  "Ich wohne seit drei Jahren in Zürich und arbeite dort in einem kleinen Büro neben dem Bahnhof";

test("words and syllables come from the text, durations from the signal", () => {
  const s = measureSpoken(delivery(), SENTENCE, RULE, FILLERS);
  assert.equal(s.wordCount, 17);
  assert.ok(s.syllableCount > s.wordCount, "German words average more than one syllable");
  // 12 s of phonation inside a 16 s stretch, so articulation is the faster one.
  assert.ok(s.articulationRate > s.speechRate, "articulation excludes the pauses");
  assert.ok(Math.abs(s.speechRate - s.syllableCount / 16) < 0.02);
  assert.ok(Math.abs(s.articulationRate - s.syllableCount / 12) < 0.02);
});

test("the span is the speaking stretch, not the whole file", () => {
  // Two recordings with identical speech, one made by somebody slower to reach
  // the stop button. Reporting the second as the slower speaker would be a
  // measurement of their thumb.
  const quick = measureSpoken(delivery({ totalMs: 17_000 }), SENTENCE, RULE, FILLERS);
  const slow = measureSpoken(delivery({ totalMs: 45_000 }), SENTENCE, RULE, FILLERS);
  assert.equal(quick.speechRate, slow.speechRate);
});

test("filled pauses are counted and not folded into anything else", () => {
  const s = measureSpoken(delivery(), `Ähm ${SENTENCE} äh ja hm`, RULE, FILLERS);
  assert.equal(s.filledPauseCount, 3, "case-insensitive, and every one of them");
  const none = measureSpoken(delivery(), SENTENCE, RULE, FILLERS);
  assert.equal(none.filledPauseCount, 0);
});

test("a take too small for a rate reports no rate rather than a loud one", () => {
  const short = measureSpoken(
    delivery({ speechMs: 1_200, pauseMs: 300 }),
    "Ja genau",
    RULE,
    FILLERS,
  );
  assert.equal(short.speechRate, 0, "two words over a second is not a speech rate");
  assert.equal(short.articulationRate, 0);
  // The counts are still real and still reported.
  assert.equal(short.wordCount, 2);
});

test("no words means no rate and nothing thrown", () => {
  const s = measureSpoken(delivery(), "", RULE, FILLERS);
  assert.equal(s.wordCount, 0);
  assert.equal(s.syllableCount, 0);
  assert.equal(s.speechRate, 0);
  assert.equal(s.articulationRate, 0);
});

test("degenerate delivery does not divide by zero", () => {
  const empty = delivery({ speechMs: 0, pauseMs: 0, runCount: 0, phonationRatio: 0 });
  const s = measureSpoken(empty, SENTENCE, RULE, FILLERS);
  assert.ok(Number.isFinite(s.speechRate) && Number.isFinite(s.articulationRate));
  assert.equal(s.wordsPerRun, 0);
});

/**
 * THE SHAPE, which is the one thing here that resembles an interpretation —
 * and is therefore the thing that has to refuse to answer most often.
 */
test("a speaker who is hunting for words is told which of the two problems they have", () => {
  // Same words, same articulation, twice the silence: the vocabulary is there
  // and the retrieval is not.
  const hunting = delivery({ speechMs: 10_000, pauseMs: 8_000, phonationRatio: 0.55 });
  const s = measureSpoken(hunting, SENTENCE, RULE, FILLERS);
  assert.equal(interpretation(hunting, s), "hunting");
});

test("a speaker who came straight through is not told they were hunting", () => {
  const even = delivery({ speechMs: 15_000, pauseMs: 600, pauseCount: 1, phonationRatio: 0.96 });
  const s = measureSpoken(even, SENTENCE, RULE, FILLERS);
  assert.equal(interpretation(even, s), "even");
});

test("there is no verdict on a take too small to carry one", () => {
  const tiny = delivery({ speechMs: 1_000, pauseMs: 200, totalMs: 1_400, problems: ["too-short"] });
  const s = measureSpoken(tiny, "Ja", RULE, FILLERS);
  assert.equal(interpretation(tiny, s), "unclear");

  const quiet = delivery({ problems: ["too-quiet"] });
  assert.equal(interpretation(quiet, measureSpoken(quiet, SENTENCE, RULE, FILLERS)), "unclear");
});

/**
 * THE §8 TEST, the same one `delivery.test.ts` runs, because this type is the
 * next place a `score` field would want to appear — it is the one that finally
 * has words to score.
 */
test("no measure here is a rating either", () => {
  const s: Spoken = measureSpoken(delivery(), SENTENCE, RULE, FILLERS);
  const banned = [
    "score",
    "rating",
    "grade",
    "accuracy",
    "nativeness",
    "pronunciation",
    "level",
    "percent",
  ];
  for (const key of Object.keys(s)) {
    for (const word of banned) {
      assert.ok(
        !key.toLowerCase().includes(word),
        `Spoken.${key} reads as a rating. §8 forbids one; every field here is a count or a rate.`,
      );
    }
  }
});
