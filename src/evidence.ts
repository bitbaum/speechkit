/**
 * What a transcript is allowed to be evidence OF.
 *
 * This is the load-bearing rule of the whole speaking-evaluation surface, and
 * it is one sentence:
 *
 *   A transcript is evidence about the speaker's WORDS only when the
 *   recogniser returns the variety that was SPOKEN.
 *
 * Heidi (the product this was extracted from) arrived at the Swiss German case first and stated
 * it exactly: dialect recognition transcribes INTO Standard German, because
 * that is what every corpus was built to do, so a learner who says a flawless
 * Zurich sentence gets back `ist` and `nicht` and possibly a `ß` — none of
 * which they said. Judging their grammar from that bills the recogniser's
 * output to the learner.
 *
 * WHAT THIS FILE ADDS is that the rule is not about Swiss German. It is about
 * a property that differs per variety, and stating it that way is what makes
 * the surface safe to switch ON where the property holds. Standard German
 * recognition returns Standard German. Ukrainian returns Ukrainian. In those
 * cases the transcript IS the learner's words, and grammar, vocabulary and
 * speech rate become measurable rather than invented.
 *
 * So the same product is honest in both directions:
 *
 *   dialect      → measure the signal; answer the meaning; judge no forms.
 *   the bridge   → measure the signal AND the words.
 *
 * That second line is not a consolation prize for Heidi. Zurich is diglossic:
 * the German you need at a doctor's desk, a Verwaltung counter or an insurer's
 * phone line is Swiss Standard German, §9 already makes producing it a product
 * output, and speaking it is the half nothing here has touched.
 *
 * Pure: no I/O, no model, same input -> same output.
 */

/**
 * What recognition can do for one variety.
 *
 * Three facts, because three different things go wrong. A variety with no
 * recogniser at all, one whose recogniser answers in a DIFFERENT variety, and
 * one whose recogniser answers correctly but badly, each need a different
 * product behaviour — and collapsing them into a single boolean is how a
 * product ends up confidently correcting a dialect speaker.
 */
export type Recognition = {
  /** Is there a recogniser for this variety at all? */
  available: boolean;
  /**
   * Does it return the variety that was SPOKEN?
   *
   * False means it TRANSLATES — the output is a different variety from the
   * input. That is the Swiss German case, and it is not a quality problem: a
   * perfect dialect recogniser that emits Standard German still tells you
   * nothing about which forms the speaker used.
   */
  returnsSpokenVariety: boolean;
  /**
   * Best published word error rate for this variety, as a percentage.
   *
   * Undefined when nobody has published one on a test set we can name. Absent
   * is not zero and is not "fine" — `evidenceFrom` treats it as unknown and
   * refuses form judgement, because a number nobody measured is the kind of
   * blank a product fills in optimistically.
   */
  wer?: number;
};

/**
 * What the transcript may be used for.
 *
 * `none`         there is no transcript.
 * `meaning-only` there is one, and it says what was MEANT. Answer it, search
 *                it, count how long it took to say. Do not judge its forms —
 *                they are the recogniser's.
 * `words`        the transcript is the learner's own words. Grammar,
 *                vocabulary and syllable-rate are all on the table.
 */
export type EvidenceKind = "none" | "meaning-only" | "words";

/**
 * Above this word error rate, a transcript's own mistakes are frequent enough
 * that grammar findings drawn from it are mostly noise.
 *
 * A DECISION, in §3's sense, not a finding — no paper sets this line and this
 * file does not pretend one does. The reasoning is arithmetic: at 6% roughly
 * one word in sixteen is wrong, so a flagged sentence is usually the learner's
 * and they can see the text that was flagged; at 25% it is one in four and
 * every third correction is about something they never said. Fifteen is where
 * we stop being willing to defend the output to somebody who paid attention.
 *
 * Raising it is a product decision that should be argued in HEIDI.md, not a
 * constant somebody nudges.
 */
export const FORM_JUDGEMENT_MAX_WER = 15;

export function evidenceFrom(recognition: Recognition): EvidenceKind {
  if (!recognition.available) return "none";
  if (!recognition.returnsSpokenVariety) return "meaning-only";
  // Unknown accuracy is not assumed accuracy.
  if (recognition.wer === undefined) return "meaning-only";
  if (recognition.wer > FORM_JUDGEMENT_MAX_WER) return "meaning-only";
  return "words";
}

/**
 * May anything in this transcript be corrected as the learner's own language?
 *
 * The one question every caller actually has. Written as its own function so
 * a route asks a named rule rather than re-deriving the comparison, which is
 * how the two callers end up disagreeing.
 */
export function mayJudgeForm(recognition: Recognition): boolean {
  return evidenceFrom(recognition) === "words";
}

/**
 * May the transcript be shown to the learner AS what they said?
 *
 * Deliberately stricter than "is there a transcript". A translated transcript
 * shown under the heading "what you said" is a false statement in the one
 * place a learner cannot check it — they do not know the target variety, which
 * is why they are here. It may still be shown, but it has to be labelled as
 * the machine's rendering, which is a caller's job and the reason this is not
 * folded into `mayJudgeForm`.
 */
export function isFaithfulRendering(recognition: Recognition): boolean {
  return recognition.available && recognition.returnsSpokenVariety;
}
