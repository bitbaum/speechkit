import { test } from "node:test";
import assert from "node:assert/strict";
import { countSyllables, countSyllablesIn, words, type SyllableRule } from "./syllables.ts";

/**
 * The German rule, written here rather than imported from a pack, because
 * these tests are about the ENGINE: a second language supplies a different
 * rule and must get the same behaviour out of it.
 */
const GERMAN: SyllableRule = { vowels: "aeiouäöüy", adjacentVowelsMerge: true };

const counted: Array<[string, number]> = [
  ["Haus", 1],
  ["Häuser", 2],
  ["ich", 1],
  ["eine", 2],
  ["Auge", 2],
  ["Arbeit", 2],
  ["Freundin", 2],
  ["sieben", 2],
  ["vielleicht", 2],
  ["Bäckerei", 3],
  ["Zürich", 2],
  ["Wohnung", 2],
  ["Termin", 2],
  ["Entschuldigung", 4],
  ["Krankenversicherung", 6],
  ["Strassenbahn", 3],
];

test("German words are counted as a German speaker says them", () => {
  for (const [word, expected] of counted) {
    assert.equal(countSyllables(word, GERMAN), expected, `${word} should be ${expected} syllables`);
  }
});

test("a word is never zero syllables, and punctuation is not a word", () => {
  assert.equal(countSyllables("s", GERMAN), 1, "a word with no vowel still takes time to say");
  assert.equal(countSyllables("!!!", GERMAN), 0, "but punctuation is not a word at all");
  assert.equal(countSyllables("", GERMAN), 0);
});

test("y is an ordinary vowel here, which is what German does with it", () => {
  // Han-dy, Phy-sik, Rhyth-mus: the y is a nucleus in its own right, and the
  // alternative — leaving y out of the vowels — undercounts all three.
  assert.equal(countSyllables("Handy", GERMAN), 2);
  assert.equal(countSyllables("Physik", GERMAN), 2);
  assert.equal(countSyllables("Rhythmus", GERMAN), 2);
  assert.equal(countSyllables("System", GERMAN), 2);
});

/**
 * THE KNOWN ERROR, asserted on purpose.
 *
 * Adjacent vowels are one nucleus, which is right for `sieben` and wrong for
 * `Familie` — and no letter rule can tell those apart, because the difference
 * is in the word rather than in the spelling. The rule takes the far commoner
 * reading and undercounts the `-ie` hiatus words by one.
 *
 * It is pinned here rather than left as a footnote so that nobody reads the
 * measure as exact, and so that a future fix has to change a test that states
 * what it is fixing. It costs a fraction of a syllable per hundred words in
 * ordinary speech, and the rate this feeds is compared against the learner's
 * OWN earlier takes, where a consistent bias cancels.
 */
test("KNOWN LIMIT: adjacent vowels that are two nuclei are counted as one", () => {
  // Hiatus: a speaker says Fa-mi-li-e and Stu-di-e.
  assert.equal(countSyllables("Familie", GERMAN), 3, "a speaker says four");
  assert.equal(countSyllables("Studie", GERMAN), 2, "a speaker says three");

  // The same root cause with y in the middle of it: B-a-y-e-rn is three
  // adjacent vowel letters and two nuclei, Bay-ern. Kept as a second example
  // rather than special-cased, because a rule with an exception list for
  // proper nouns is a dictionary that has not admitted it yet.
  assert.equal(countSyllables("Bayern", GERMAN), 1, "a speaker says two");

  // Consistent, which is the property that makes the comparison survive it.
  assert.equal(countSyllables("Familie", GERMAN), countSyllables("Familie", GERMAN));
});

test("counting across a sentence adds up", () => {
  const sentence = words("Guten Tag, ich hätte gern einen Termin.");
  assert.deepEqual(sentence, ["Guten", "Tag", "ich", "hätte", "gern", "einen", "Termin"]);
  // 2 + 1 + 1 + 2 + 1 + 2 + 2
  assert.equal(countSyllablesIn(sentence, GERMAN), 11);
});

test("a contraction is one word, not two", () => {
  // Splitting `gaht's` would inflate every word count in the product.
  assert.deepEqual(words("wie gaht's dir"), ["wie", "gaht's", "dir"]);
  assert.deepEqual(words("d’Frau"), ["d’Frau"]);
});

test("digits are dropped rather than guessed at", () => {
  // "2019" is said as a number of syllables nothing here can derive from the
  // characters, and guessing would put an invented figure into a measured one.
  assert.deepEqual(words("am 3. März 2019"), ["am", "März"]);
});

test("the engine is not German — a different rule gives different answers", () => {
  // A rule that does not know umlauts are vowels sees no nucleus in `Häuser`
  // beyond the `e`, which is exactly the kind of wrong a hardcoded engine
  // would be for the second language it met.
  const noUmlauts: SyllableRule = { vowels: "aeiou", adjacentVowelsMerge: true };
  assert.equal(
    countSyllables("Häuser", noUmlauts),
    2,
    "ä is not a vowel to this rule, but u and e are",
  );
  assert.equal(countSyllables("Häuser", GERMAN), 2);
  assert.equal(
    countSyllables("für", noUmlauts),
    1,
    "and a word of pure umlaut still cannot be zero",
  );
  assert.equal(countSyllables("Öl", noUmlauts), 1);
  assert.equal(countSyllables("Öl", GERMAN), 1);
});
