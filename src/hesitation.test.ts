import { test } from "node:test";
import assert from "node:assert/strict";
import { hesitations, MAX_HESITATIONS } from "./hesitation.ts";
import { SEARCH_PAUSE_MS } from "./pause.ts";

const w = (word: string, start: number, end: number) => ({ word, start, end });

/**
 * THE REAL ONE. Exactly what Groq's whisper-large-v3-turbo returned on
 * 2026-09-25 for real Commons recordings stitched as
 * "Er hat den [1.8 s silence] Buch gelesen": no gap between any two words —
 * "Buch" was stretched across the whole pause. The first version of this module
 * looked for gaps and found nothing here.
 */
const GROQ_OBSERVED = [
  w("Er", 0.48, 0.74),
  w("hat", 0.74, 1.28),
  w("den", 1.28, 1.84),
  w("Buch", 1.84, 4.14),
  w("gelesen.", 4.14, 5.28),
];

test("a recogniser that swallows the pause into the next word still names that word", () => {
  // The signal measured the silence where it really was.
  const pauses = [{ startMs: 1860, endMs: 3660 }];
  assert.deepEqual(hesitations(pauses, GROQ_OBSERVED), [{ before: "Buch", index: 3, ms: 1800 }]);
});

test("a recogniser that leaves a clean gap gives the same answer", () => {
  const gapped = [
    w("Er", 0.48, 0.74),
    w("hat", 0.8, 1.2),
    w("den", 1.25, 1.6),
    w("Buch", 3.4, 3.9),
    w("gelesen", 4.0, 4.6),
  ];
  assert.deepEqual(hesitations([{ startMs: 1600, endMs: 3400 }], gapped), [
    { before: "Buch", index: 3, ms: 1800 },
  ]);
});

test("the recogniser's punctuation is not something the learner said", () => {
  const pauses = [{ startMs: 3000, endMs: 4300 }];
  assert.deepEqual(hesitations(pauses, GROQ_OBSERVED), [{ before: "gelesen", index: 4, ms: 1300 }]);
});

test("an ordinary breath is not pointed at, and the line is exactly SEARCH_PAUSE_MS", () => {
  assert.deepEqual(
    hesitations([{ startMs: 1000, endMs: 1000 + SEARCH_PAUSE_MS - 1 }], GROQ_OBSERVED),
    [],
  );
  assert.equal(
    hesitations([{ startMs: 1000, endMs: 1000 + SEARCH_PAUSE_MS }], GROQ_OBSERVED).length,
    1,
  );
});

test("no words means nothing can be named — never a guess", () => {
  assert.deepEqual(hesitations([{ startMs: 1000, endMs: 3000 }], []), []);
});

test("a pause after the last recognised word names nothing", () => {
  assert.deepEqual(hesitations([{ startMs: 5400, endMs: 6400 }], GROQ_OBSERVED), []);
});

test("only the longest few are kept, and they read in sentence order", () => {
  const words = [w("a", 0, 1), w("b", 1, 2), w("c", 2, 3), w("d", 3, 4), w("e", 4, 5)];
  const pauses = [
    { startMs: 0, endMs: 1500 }, // resumes inside b → b, 1500
    { startMs: 1600, endMs: 2500 }, // → c, 900
    { startMs: 2500, endMs: 3900 }, // → d, 1400
    { startMs: 3950, endMs: 4800 }, // → e, 850
  ];
  const found = hesitations(pauses, words);
  assert.equal(found.length, MAX_HESITATIONS);
  assert.deepEqual(
    found.map((h) => h.before),
    ["b", "c", "d"],
    "the three longest (1500, 900, 1400), in the order they were said",
  );
});
