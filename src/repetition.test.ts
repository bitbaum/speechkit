import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NATION_LADDER,
  POCKET_LADDER,
  isLadder,
  nextLimit,
  trajectory,
  type Attempt,
} from "./repetition.ts";
import type { Fluency } from "./fluency.ts";

const fluency = (speechRate: number, pauseCount: number): Fluency => ({
  wordCount: 40,
  syllableCount: 60,
  spanMs: 30_000,
  phonationMs: 24_000,
  pauseMs: 6_000,
  pauseCount,
  longestPauseMs: 1_200,
  speechRate,
  articulationRate: speechRate * 1.2,
  meanLengthOfRun: 8,
  runCount: 7,
});

const attempt = (index: number, rate: number, pauses: number, limit = 120): Attempt => ({
  index,
  limitSeconds: limit,
  fluency: fluency(rate, pauses),
});

test("a ladder must shrink, or it is repetition without the pressure", () => {
  assert.equal(isLadder(NATION_LADDER), true);
  assert.equal(isLadder(POCKET_LADDER), true);
  assert.equal(isLadder([120, 120, 120]), false, "three equal turns is not the exercise");
  assert.equal(isLadder([60, 90, 120]), false, "and growing is the opposite of it");
  assert.equal(isLadder([120]), false, "one delivery is not a repetition");
  assert.equal(isLadder([]), false);
  assert.equal(isLadder([120, 0]), false);
});

test("the original and the scaled ladder are both three shrinking deliveries", () => {
  assert.equal(NATION_LADDER.length, 3);
  assert.equal(POCKET_LADDER.length, 3);
  assert.deepEqual([...NATION_LADDER], [240, 180, 120], "four, three, two minutes");
});

/**
 * The finding the exercise exists for: rate rises across deliveries. This is
 * the FACT half of §3 — a within-session rise, which is what the learner will
 * actually see.
 */
test("a rising rate across deliveries is reported as rising", () => {
  const t = trajectory([attempt(0, 2.0, 9), attempt(1, 2.4, 6), attempt(2, 2.9, 4)], POCKET_LADDER);
  assert.equal(t.deliveries, 3);
  assert.equal(t.rateTrend, "rose");
  assert.equal(t.pauseTrend, "fell");
  assert.equal(t.rateRatio, 1.45, "2.9 over 2.0");
  assert.equal(t.complete, true);
});

test("one take compares against nothing, and says so rather than showing no change", () => {
  const t = trajectory([attempt(0, 2.0, 9)], POCKET_LADDER);
  assert.equal(t.rateRatio, null, "a +0% would read as a measurement of no change");
  assert.equal(t.rateTrend, "flat");
  assert.equal(t.complete, false);
});

test("a difference inside the measurement's own noise is not a finding", () => {
  // The same person saying the same sentence twice does not produce the same
  // number. Reporting that as improvement is the flattering lie.
  const t = trajectory([attempt(0, 2.0, 7), attempt(1, 2.04, 6)], POCKET_LADDER);
  assert.equal(t.rateTrend, "flat");
  assert.equal(t.pauseTrend, "flat");
});

test("going backwards is reported too, not only the flattering direction", () => {
  const t = trajectory([attempt(0, 2.8, 3), attempt(1, 2.0, 11)], POCKET_LADDER);
  assert.equal(t.rateTrend, "fell");
  assert.equal(t.pauseTrend, "rose");
  assert.ok(t.rateRatio !== null && t.rateRatio < 1);
});

test("attempts out of order are sorted, not believed", () => {
  // A reversed pair would invert the finding while looking well-formed.
  const forwards = trajectory([attempt(0, 2.0, 9), attempt(1, 2.8, 4)], POCKET_LADDER);
  const shuffled = trajectory([attempt(1, 2.8, 4), attempt(0, 2.0, 9)], POCKET_LADDER);
  assert.deepEqual(shuffled, forwards);
  assert.equal(shuffled.rateTrend, "rose");
});

test("a take that measured nothing cannot be the baseline of a ratio", () => {
  const t = trajectory([attempt(0, 0, 0), attempt(1, 2.5, 5)], POCKET_LADDER);
  assert.equal(t.rateRatio, null, "dividing by a silent take would report an infinite gain");
  assert.ok(Number.isFinite(t.speechRate[1]));
});

test("the clock walks down the ladder and then stops", () => {
  assert.equal(nextLimit(0, POCKET_LADDER), 120);
  assert.equal(nextLimit(1, POCKET_LADDER), 90);
  assert.equal(nextLimit(2, POCKET_LADDER), 60);
  assert.equal(nextLimit(3, POCKET_LADDER), null, "the exercise is finished, not looping");
  assert.equal(nextLimit(-1, POCKET_LADDER), null);
});

test("an unfinished ladder is not reported as complete", () => {
  const t = trajectory([attempt(0, 2.0, 9), attempt(1, 2.4, 6)], POCKET_LADDER);
  assert.equal(t.complete, false, "two of three");
  assert.equal(t.rateTrend, "rose", "but what did happen is still measured");
});
