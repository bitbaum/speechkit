/**
 * The BUILT package, as a consumer imports it.
 *
 * The unit tests in src/ run the TypeScript source directly. These run
 * dist/index.js — what `github:bitbaum/speechkit` and npm actually deliver —
 * so a broken rewrite of `./x.ts` to `./x.js`, or an export that exists in the
 * source and not the entry point, fails here rather than in somebody's app.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as kit from "../dist/index.js";

test("the four layers are all reachable from the entry point", () => {
  for (const name of [
    "measureDelivery",
    "usable",
    "evidenceFrom",
    "mayJudgeForm",
    "measureSpoken",
    "hesitations",
    "markerVerdict",
    "checkGrammar",
    "fromLanguageTool",
  ]) {
    assert.equal(typeof kit[name], "function", `${name} is not exported`);
  }
  assert.equal(kit.MIN_PAUSE_MS < kit.SEARCH_PAUSE_MS, true);
  assert.equal(kit.SEARCH_PAUSE_MS < kit.STUCK_PAUSE_MS, true, "pause < searching < stuck");
});

test("THE REFUSAL IS PART OF THE API: nothing scores pronunciation", () => {
  // Not an oversight to be filled in later. A score against a native ideal is a
  // judgement about a person; see the README. If this fails, somebody added one.
  const scorers = Object.keys(kit).filter((name) => /pronunc|accent|native|score/i.test(name));
  assert.deepEqual(scorers, []);
});

test("a translated transcript is never evidence about form, from the built code", () => {
  // The load-bearing rule, checked through the entry point rather than trusted.
  const translating = { available: true, returnsSpokenVariety: false, wer: 0 };
  assert.equal(kit.evidenceFrom(translating), "meaning-only");
  assert.equal(kit.mayJudgeForm(translating), false);
});

test("the signal layer runs on raw samples with no language at all", () => {
  const rate = 16000;
  const samples = new Float32Array(rate * 3);
  for (let i = 0; i < rate; i++) samples[i] = 0.3 * Math.sin((2 * Math.PI * 140 * i) / rate);
  for (let i = rate * 2; i < rate * 3; i++)
    samples[i] = 0.3 * Math.sin((2 * Math.PI * 140 * i) / rate);
  const delivery = kit.measureDelivery(samples, rate);
  assert.equal(delivery.pauseCount, 1, "one silence between two stretches of sound");
  assert.equal(delivery.pauseSpans.length, 1);
});
