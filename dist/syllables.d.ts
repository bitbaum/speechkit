/**
 * Counting syllables, which is what turns a transcript into a speech RATE.
 *
 * `delivery.ts` deliberately reports no rate: syllables per second is the
 * standard fluency measure and counting syllables needs words, which the
 * signal alone does not have. With a transcript in the variety that was spoken
 * (see `evidence.ts`) the measure becomes available, and it is the most
 * informative number in the whole surface — speech rate and mean length of run
 * are what "fluency" means in the research sense, as distinct from how good
 * somebody sounds.
 *
 * ONE RULE, WITH ONE SWITCH: COUNT VOWEL GROUPS, OR VOWEL LETTERS.
 *
 * A run of adjacent vowel letters is one nucleus. That is the whole algorithm,
 * and it arrived at that size by being written larger first: an earlier draft
 * carried a list of digraphs — `au`, `ei`, `ie`, `äu` — to merge into single
 * nuclei, and the tests showed every one of them was a no-op. German writes
 * its diphthongs as adjacent vowels, so the group scan had already merged
 * them. The list was machinery that looked like knowledge.
 *
 * WHY A RULE AND NOT A DICTIONARY. A hyphenation dictionary would be exact and
 * would also be a per-language download, a licence question, and a word that
 * is missing the one time it matters. A vowel-group rule is a few lines, has
 * no licence, and works on a word it has never seen — including the compounds
 * German invents on the spot, which is exactly where a dictionary fails.
 *
 * The error it makes is stated in the tests and is CONSISTENT: the same word
 * counts the same way every time. That matters because the number is used
 * comparatively — this take against the learner's own last one — where a
 * systematic bias cancels and only the change survives. Comparing against a
 * published native norm would need exactness this does not have, which is one
 * more reason no such comparison exists anywhere in this product.
 *
 * Pure: no I/O, same input -> same output.
 */
/**
 * What counts as a syllable nucleus in one language.
 *
 * Parameterised rather than hardcoded, for the same reason everything else
 * here is: the engine is meant to serve a second language without being
 * edited. A pack supplies the rule; nothing in this file names a language.
 */
export type SyllableRule = {
    /** Letters that can be a nucleus, lowercase. */
    vowels: string;
    /**
     * Do adjacent vowel LETTERS form one nucleus, or one each?
     *
     * THE SECOND PACK FOUND THIS, which is the entire argument for writing one.
     * German writes its diphthongs as adjacent vowels — `Haus` is one syllable,
     * `eine` is two — so merging is right and the rule needed no digraph table.
     * Ukrainian has no diphthongs: every vowel letter is its own nucleus, and
     * `дякую` is дя-ку-ю. Merging counts it as two and nothing fails; the rate
     * it feeds is simply wrong by a third, in a language nobody here reads.
     *
     * A boolean rather than a clever heuristic, because the two behaviours are
     * a genuine property of a writing system and not a thing to infer per word.
     */
    adjacentVowelsMerge: boolean;
};
/**
 * Syllables in one word.
 *
 * Never returns zero for a word containing a letter: a word nobody can
 * pronounce is not a thing a learner said, and a zero would silently deflate
 * every rate it feeds.
 */
export declare function countSyllables(word: string, rule: SyllableRule): number;
/** Syllables across a list of words. */
export declare function countSyllablesIn(words: readonly string[], rule: SyllableRule): number;
/**
 * Split a transcript into words.
 *
 * Unicode-aware and apostrophe-tolerant, because `gaht's` is one word and
 * splitting it into two would inflate every word count and deflate every mean
 * word length. Digits are dropped rather than counted: "2019" is said as a
 * number of syllables nothing here can derive from the characters, and
 * guessing would put an invented figure inside a measured one.
 */
export declare function words(text: string): string[];
//# sourceMappingURL=syllables.d.ts.map