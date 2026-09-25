import { test } from "node:test";
import assert from "node:assert/strict";
import { markerVerdict, returnsSpokenVariety } from "./dialect-marker.ts";

/**
 * Zurich German against Standard German, as a consumer's language pack would
 * supply them (these are the lists Heidi ships). Written out here because the
 * engine owns no language — the last test proves it — and a package test that
 * imported a product's pack would be testing the product.
 */
const MARKERS = {
  target: [
    "isch",
    "nöd",
    "nid",
    "gaat",
    "gaht",
    "öppis",
    "gsi",
    "hät",
    "chli",
    "au",
    "scho",
    "zäme",
    "öpper",
  ],
  bridge: [
    "ist",
    "nicht",
    "geht",
    "etwas",
    "gewesen",
    "hat",
    "klein",
    "auch",
    "schon",
    "zusammen",
    "jemand",
  ],
};

/**
 * The two transcripts a vendor could return for the SAME recording. One
 * sentence, said once, written down two ways — which is precisely the thing
 * `capabilities.recognition.returnsSpokenVariety` is asking about.
 */
const SPOKEN_AS_DIALECT =
  "Das isch nöd so schlimm, ich gaat scho hüt zum Arzt und denn simmer zäme dört.";
const TRANSLATED_TO_STANDARD =
  "Das ist nicht so schlimm, ich gehe schon heute zum Arzt und dann sind wir zusammen dort.";

test("a transcript that KEPT the dialect is recognised as the spoken variety", () => {
  const verdict = markerVerdict(SPOKEN_AS_DIALECT, MARKERS);
  assert.equal(verdict.variety, "target");
  assert.ok(verdict.targetHits.length >= 3, `saw ${JSON.stringify(verdict.targetHits)}`);
  assert.equal(returnsSpokenVariety(verdict), true);
});

/**
 * THE FAILURE THE WHOLE REGISTER IS ABOUT. Every published Swiss German
 * recogniser answers like this, and a product that judged a learner's grammar
 * from it would be correcting the machine's German.
 */
test("a transcript TRANSLATED into the bridge is caught as the bridge", () => {
  const verdict = markerVerdict(TRANSLATED_TO_STANDARD, MARKERS);
  assert.equal(verdict.variety, "bridge");
  assert.ok(verdict.bridgeHits.length >= 3, `saw ${JSON.stringify(verdict.bridgeHits)}`);
  assert.equal(returnsSpokenVariety(verdict), false);
});

test("the two verdicts genuinely disagree on the same sentence", () => {
  // If these ever agree, the markers have stopped separating the varieties and
  // the instrument is worthless while still returning an answer.
  assert.notEqual(
    markerVerdict(SPOKEN_AS_DIALECT, MARKERS).variety,
    markerVerdict(TRANSLATED_TO_STANDARD, MARKERS).variety,
  );
});

test("one stray word does not decide it", () => {
  // A dialect transcript may legitimately carry a Standard word — a quotation,
  // a proper noun, a word the two varieties share. Calling the verdict on a
  // single hit would make this as unreliable as the claim it checks.
  const mostlyDialect = "Das isch nöd schlimm, er hät gseit das ist okay";
  assert.equal(markerVerdict(mostlyDialect, MARKERS).variety, "target");
});

test("too little to go on is an answer, not a guess", () => {
  // A clip with no marker either way. `unclear` is what stops the experiment
  // reporting a verdict it did not earn.
  const neutral = "Zürich Hauptbahnhof, Gleis zwölf.";
  const verdict = markerVerdict(neutral, MARKERS);
  assert.equal(verdict.variety, "unclear");
  assert.equal(returnsSpokenVariety(verdict), null, "null is the honest answer, not false");

  assert.equal(markerVerdict("", MARKERS).variety, "unclear");
});

test("markers match whole words only", () => {
  // `auch` contains `au`, and `ist` appears inside `Krist`. Substring matching
  // would score both sides on words that are neither.
  const verdict = markerVerdict("Kristall Auto Auslage", MARKERS);
  assert.deepEqual(verdict.targetHits, []);
  assert.deepEqual(verdict.bridgeHits, []);
});

test("the pack supplies the words, not the engine", () => {
  // Swap the markers and the same text reads the other way round — the
  // instrument knows no language of its own.
  const inverted = { target: MARKERS.bridge, bridge: MARKERS.target };
  assert.equal(markerVerdict(SPOKEN_AS_DIALECT, inverted).variety, "bridge");
  assert.equal(markerVerdict(SPOKEN_AS_DIALECT, { target: [], bridge: [] }).variety, "unclear");
});
