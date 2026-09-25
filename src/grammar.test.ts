import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SPOKEN_CATEGORIES,
  fromLanguageTool,
  worthShowing,
  type GrammarFinding,
} from "./grammar.ts";

/**
 * A LanguageTool response, shaped as the real one is. Written by hand rather
 * than captured, so every field a test depends on is visible here instead of
 * buried in a fixture nobody reads.
 */
const match = (over: Record<string, unknown> = {}) => ({
  message: "Möglicher Grammatikfehler.",
  offset: 0,
  length: 3,
  replacements: [{ value: "dem" }],
  rule: { id: "DE_AGREEMENT", category: { id: "AGREEMENT" } },
  ...over,
});

const TRANSCRIPT = "der Frau gehört das Velo und ich habe kein Termin bekommen";

test("a real grammar finding survives with its text taken from the transcript", () => {
  const findings = fromLanguageTool({ matches: [match()] }, TRANSCRIPT);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, "DE_AGREEMENT");
  assert.equal(findings[0].category, "AGREEMENT");
  assert.equal(
    findings[0].text,
    "der",
    "sliced out of the transcript by offset, not echoed from the vendor",
  );
  assert.deepEqual(findings[0].replacements, ["dem"]);
});

/**
 * THE RULE THIS FILE EXISTS FOR. Punctuation, capitals and spelling in a
 * transcript are the recogniser's decisions. Flagging them bills the machine's
 * choices to the speaker.
 */
test("NOTHING THE SPEAKER COULD NOT HAVE SAID IS EVER FLAGGED", () => {
  const machineChoices = [
    match({ rule: { id: "GERMAN_SPELLER_RULE", category: { id: "TYPOS" } } }),
    match({ rule: { id: "DE_CASE", category: { id: "CASING" } } }),
    match({ rule: { id: "KOMMA_VOR_UND_ODER", category: { id: "PUNCTUATION" } } }),
    match({ rule: { id: "DASH_RULE", category: { id: "TYPOGRAPHY" } } }),
  ];
  const findings = fromLanguageTool({ matches: machineChoices }, TRANSCRIPT);
  assert.deepEqual(findings, [], "you cannot hear a spelling, a capital or a comma");
});

test("style and redundancy are opinions, not errors, and a speaker gets neither", () => {
  const opinions = [
    match({ rule: { id: "STYLE_RULE", category: { id: "STYLE" } } }),
    // Repetition in speech is how people buy thinking time.
    match({ rule: { id: "GERMAN_WORD_REPEAT_RULE", category: { id: "REDUNDANCY" } } }),
  ];
  assert.deepEqual(fromLanguageTool({ matches: opinions }, TRANSCRIPT), []);
});

test("a rule that is right about writing and wrong about speech is exempt by id", () => {
  // Filed under GRAMMAR in some versions, so the category allowlist alone
  // would let it through — which is why there is a second list.
  const capital = match({ rule: { id: "UPPERCASE_SENTENCE_START", category: { id: "GRAMMAR" } } });
  assert.deepEqual(fromLanguageTool({ matches: [capital] }, TRANSCRIPT), []);
});

test("a malformed response drops the finding rather than the whole check", () => {
  const mixed = [
    match(),
    null,
    "not an object",
    match({ rule: undefined }),
    match({ rule: { id: "X" } }), // no category
    match({ offset: "nope" }),
    match({ offset: 9999, length: 5 }), // past the end of the transcript
    match({ length: 0 }),
  ];
  const findings = fromLanguageTool({ matches: mixed as unknown[] }, TRANSCRIPT);
  assert.equal(findings.length, 1, "the one good finding survives");
});

test("a response that is not a response at all yields nothing", () => {
  for (const body of [null, undefined, {}, { matches: "no" }, [], 42]) {
    assert.deepEqual(
      fromLanguageTool(body, TRANSCRIPT),
      [],
      `threw or misread on ${JSON.stringify(body)}`,
    );
  }
});

test("at most three alternatives, because nobody reads a fourth", () => {
  const many = match({
    replacements: [{ value: "a" }, { value: "b" }, { value: "c" }, { value: "d" }, { value: 7 }],
  });
  const [finding] = fromLanguageTool({ matches: [many] }, TRANSCRIPT);
  assert.deepEqual(finding.replacements, ["a", "b", "c"]);
});

test("a take shows a few findings in reading order, not a marked-up essay", () => {
  const findings: GrammarFinding[] = [30, 5, 12, 20, 1].map((offset) => ({
    ruleId: `R${offset}`,
    category: "GRAMMAR",
    text: "x",
    offset,
    length: 1,
    replacements: [],
    message: "",
  }));
  const shown = worthShowing(findings);
  assert.equal(shown.length, 3);
  assert.deepEqual(
    shown.map((f) => f.offset),
    [1, 5, 12],
    "earliest first, so the list reads with the sentence",
  );
});

test("the allowlist is what a listener would notice, and holds no machine categories", () => {
  for (const banned of ["TYPOS", "CASING", "PUNCTUATION", "TYPOGRAPHY", "STYLE", "REDUNDANCY"]) {
    assert.ok(
      !SPOKEN_CATEGORIES.includes(banned),
      `${banned} must never be judged from a transcript`,
    );
  }
  assert.ok(SPOKEN_CATEGORIES.includes("GRAMMAR"));
  assert.ok(SPOKEN_CATEGORIES.includes("AGREEMENT"));
});
