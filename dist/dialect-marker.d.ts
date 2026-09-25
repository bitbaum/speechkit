/**
 * Which variety did the recogniser answer in?
 *
 * The one half of a vendor's claim that a machine can settle.
 *
 * `language-tech.ts` records Swiss vendors advertising two things: dialect
 * recognition that KEEPS dialect text, and a 97.4% accuracy figure. Those are
 * different claims and they need different instruments:
 *
 *   ACCURACY   needs a transcript a Zurich speaker wrote, to measure against.
 *              Nobody here has one, so nothing in this file pretends to
 *              measure it. A word error rate without ground truth is a number
 *              with nothing underneath it.
 *   VARIETY    needs no ground truth at all. Feed it dialect speech; if the
 *              transcript says `isch` and `nöd` it kept the dialect, and if it
 *              says `ist` and `nicht` it translated. That is decidable from
 *              the text alone.
 *
 * And the second is the one that decides the product. `evidence.ts` says a
 * transcript is evidence about a speaker's own forms ONLY when the recogniser
 * returns the variety that was spoken — so this function answers exactly the
 * question `Recognition.returnsSpokenVariety` is asking, and it answers it
 * from a real response rather than from a sales page.
 *
 * WHY MARKER WORDS AND NOT THE VARIETY GATE. The gate in §6 hunts forms from
 * the WRONG dialect — Bernese in Zurich text. That is a different question: a
 * Standard German transcript is not Bernese and sails through it clean. What
 * separates the two varieties here is the commonest function words, which is
 * also why they are the right instrument: `isch`/`ist` appears in almost every
 * sentence either language produces, so a short clip is enough.
 *
 * Pure: no I/O, no model, same input -> same output.
 */
/**
 * The words that tell the two varieties apart.
 *
 * Supplied by the pack, never written here — the same rule the rest of
 * this package follows. Nothing in this file knows what `isch` is.
 */
export type VarietyMarkers = {
    /** Words that appear in the TARGET variety and not in the bridge. */
    target: readonly string[];
    /** Words that appear in the BRIDGE and not in the target. */
    bridge: readonly string[];
};
export type MarkerVerdict = {
    /**
     * `target` — it kept the variety that was spoken.
     * `bridge`  — it translated into the bridge.
     * `unclear` — too few markers either way to say, which is a real answer for
     *             a clip too short or too neutral to contain any.
     */
    variety: "target" | "bridge" | "unclear";
    targetHits: string[];
    bridgeHits: string[];
};
export declare function markerVerdict(transcript: string, markers: VarietyMarkers): MarkerVerdict;
/**
 * What the verdict means for the pack.
 *
 * Deliberately returns the field name rather than a sentence: the point of
 * running this is to decide ONE boolean in `capabilities.recognition`, and
 * naming it here is what keeps the experiment tied to the edit it authorises.
 */
export declare function returnsSpokenVariety(verdict: MarkerVerdict): boolean | null;
//# sourceMappingURL=dialect-marker.d.ts.map