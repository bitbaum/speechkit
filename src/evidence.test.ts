import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORM_JUDGEMENT_MAX_WER,
  evidenceFrom,
  isFaithfulRendering,
  mayJudgeForm,
  type Recognition,
} from "./evidence.ts";

/**
 * The numbers here are the ones on `/technology`, so these tests double as a
 * check that the rule produces the right answer for the two real cases rather
 * than for invented ones.
 */
const ZURICH_GERMAN: Recognition = { available: true, returnsSpokenVariety: false, wer: 25.6 };
const STANDARD_GERMAN: Recognition = { available: true, returnsSpokenVariety: true, wer: 6.4 };

test("a variety with no recogniser yields no transcript and no judgement", () => {
  const none: Recognition = { available: false, returnsSpokenVariety: false };
  assert.equal(evidenceFrom(none), "none");
  assert.equal(mayJudgeForm(none), false);
  assert.equal(isFaithfulRendering(none), false);
});

/**
 * THE RULE. A perfect recogniser that answers in a different variety still
 * says nothing about which forms the speaker used.
 */
test("A TRANSLATED TRANSCRIPT IS NEVER EVIDENCE ABOUT FORM, at any error rate", () => {
  assert.equal(evidenceFrom(ZURICH_GERMAN), "meaning-only");
  assert.equal(mayJudgeForm(ZURICH_GERMAN), false);

  // Not even at a word error rate nobody has ever achieved. This is the line
  // that stops "the recogniser got better" from being read as "we may correct
  // dialect now" — accuracy was never the objection.
  const flawless: Recognition = { available: true, returnsSpokenVariety: false, wer: 0 };
  assert.equal(evidenceFrom(flawless), "meaning-only");
  assert.equal(mayJudgeForm(flawless), false);
  assert.equal(isFaithfulRendering(flawless), false, "and it must not be shown as what they said");
});

test("a transcript in the variety that was spoken is the learner's own words", () => {
  assert.equal(evidenceFrom(STANDARD_GERMAN), "words");
  assert.equal(mayJudgeForm(STANDARD_GERMAN), true);
  assert.equal(isFaithfulRendering(STANDARD_GERMAN), true);
});

test("an unmeasured recogniser is treated as unproven, not as good", () => {
  // The blank a product fills in optimistically. Absent is not zero.
  const unmeasured: Recognition = { available: true, returnsSpokenVariety: true };
  assert.equal(evidenceFrom(unmeasured), "meaning-only");
  assert.equal(mayJudgeForm(unmeasured), false);
  // It is still faithful — it returns the right variety — so it may be shown.
  assert.equal(isFaithfulRendering(unmeasured), true);
});

test("form judgement stops at the stated error rate, and the boundary is not off by one", () => {
  const at = (wer: number): Recognition => ({ available: true, returnsSpokenVariety: true, wer });
  assert.equal(mayJudgeForm(at(FORM_JUDGEMENT_MAX_WER)), true, "at the line is still allowed");
  assert.equal(mayJudgeForm(at(FORM_JUDGEMENT_MAX_WER + 0.1)), false, "past it is not");
  assert.equal(mayJudgeForm(at(2.6)), true, "a fine-tuned German model");
  assert.equal(
    mayJudgeForm(at(23)),
    false,
    "Whisper on Swiss German, even ignoring the translation",
  );
});

/**
 * The two real varieties, side by side. If this test ever goes red because
 * somebody flipped a flag, the failure message should say what it costs.
 */
test("the product behaves differently for the two varieties, and that is the design", () => {
  assert.notEqual(
    evidenceFrom(ZURICH_GERMAN),
    evidenceFrom(STANDARD_GERMAN),
    "treating the dialect and the bridge the same is the bug this rule exists to prevent",
  );
  assert.equal(evidenceFrom(ZURICH_GERMAN), "meaning-only");
  assert.equal(evidenceFrom(STANDARD_GERMAN), "words");
});
