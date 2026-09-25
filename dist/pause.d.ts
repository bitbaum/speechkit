/**
 * What counts as a pause. One definition, for both halves of the measurement.
 *
 * Its own file, holding one constant, because two things measure pauses from
 * opposite directions and must agree:
 *
 *   `delivery.ts`  from the SIGNAL — gaps between sound.
 *   `speech/fluency.ts`            from the TRANSCRIPT — gaps between words.
 *
 * If those two used different thresholds the product would report a different
 * number of pauses for the same recording depending on which half answered,
 * and nothing would fail: both would be internally consistent and quietly
 * wrong about the same thirty seconds. That is the class of bug a shared
 * constant exists to make impossible rather than unlikely.
 *
 * Deliberately not in either caller. Whichever one held it would look like its
 * owner, and the other would look like it was borrowing — which is how a
 * "temporary" local copy gets made the next time someone tunes one of them.
 */
/**
 * The gap that counts as a pause, in milliseconds.
 *
 * 250 ms, for a phonetic reason rather than a tidy one: the silence inside a
 * `t` or a `k` is tens of milliseconds, so a lower threshold reports a person's
 * own consonants back to them as hesitation. It is also the conventional
 * silent-pause threshold in the fluency literature, which is convenient rather
 * than the argument.
 */
export declare const MIN_PAUSE_MS = 250;
/**
 * THREE PAUSE LENGTHS, ONE FILE, because two of them once met on the same
 * screen and contradicted each other.
 *
 * A real take showed "Längste Pause 1.8 s", then "Keine langen Pausen — Sie
 * sind durchgekommen, ohne stecken zu bleiben", then a new panel pointing at
 * that same 1.8 s. Each line was right by its own threshold, and the page read
 * as if it could not decide. The fix was not to pick one number: the three are
 * genuinely different things, and the page now names them differently.
 *
 *   MIN_PAUSE_MS        a gap that COUNTS as a pause at all (above)
 *   SEARCH_PAUSE_MS     long enough that the speaker was SEARCHING for a word —
 *                       worth naming the word that came next
 *   STUCK_PAUSE_MS      long enough that the speaker was STUCK — a stall by any
 *                       reading, in any language
 *
 * Both are DECISIONS in §3's sense. Search is three times the pause floor,
 * roughly where a listener notices the speaker looking for something; stuck is
 * the length at which a conversation partner starts to help.
 */
export declare const SEARCH_PAUSE_MS: number;
export declare const STUCK_PAUSE_MS = 3000;
/** Where one pause was, in ms from the start of the recording. */
export type PauseSpan = {
    startMs: number;
    endMs: number;
};
//# sourceMappingURL=pause.d.ts.map