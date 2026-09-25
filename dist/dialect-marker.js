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
import { words } from "./syllables.js";
/**
 * How many more markers one side needs before the answer is called.
 *
 * A transcript can legitimately carry one word of the other variety — a proper
 * noun, a quotation, a word the two share — and calling the verdict on a
 * single hit would make this instrument as unreliable as the claim it exists
 * to check.
 */
const MARGIN = 2;
export function markerVerdict(transcript, markers) {
    const target = new Set(markers.target.map((w) => w.toLowerCase()));
    const bridge = new Set(markers.bridge.map((w) => w.toLowerCase()));
    const targetHits = [];
    const bridgeHits = [];
    for (const word of words(transcript)) {
        const w = word.toLowerCase();
        if (target.has(w))
            targetHits.push(w);
        if (bridge.has(w))
            bridgeHits.push(w);
    }
    const difference = targetHits.length - bridgeHits.length;
    const variety = difference >= MARGIN ? "target" : difference <= -MARGIN ? "bridge" : "unclear";
    return { variety, targetHits, bridgeHits };
}
/**
 * What the verdict means for the pack.
 *
 * Deliberately returns the field name rather than a sentence: the point of
 * running this is to decide ONE boolean in `capabilities.recognition`, and
 * naming it here is what keeps the experiment tied to the edit it authorises.
 */
export function returnsSpokenVariety(verdict) {
    if (verdict.variety === "unclear")
        return null;
    return verdict.variety === "target";
}
//# sourceMappingURL=dialect-marker.js.map