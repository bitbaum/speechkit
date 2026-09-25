/**
 * Grammar findings from a transcript, and the much harder question of which
 * ones a person who was SPEAKING deserves to see.
 *
 * WHY LANGUAGETOOL RATHER THAN A MODEL. Three reasons, and the third is the
 * one that decides it:
 *
 *  1. It runs on our own box. LGPL-2.1, a Java REST server, no vendor, no
 *     per-call cost, and no learner's words leaving the machine — which is the
 *     same privacy position the rest of the speaking surface takes and would
 *     otherwise quietly abandon the moment grammar was added.
 *  2. It costs nothing per call, so grammar is not rationed the way a model
 *     answer is.
 *  3. IT IS THE SAME KIND OF THING AS THE VARIETY GATE. A rule with an id,
 *     the same input giving the same output, and a finding somebody can argue
 *     with. §6 exists because a model must not be the sole judge of language
 *     the learner cannot audit; that argument does not stop being true for
 *     grammar. A model may still comment — it does, once, elsewhere — but what
 *     is presented as a FINDING is deterministic.
 *
 * WHAT MAKES THIS DIFFERENT FROM CHECKING WRITING, AND IT IS NOT A DETAIL.
 *
 * The text arrived from a recogniser, so parts of it were never the speaker's.
 * Punctuation, capitalisation and spelling are decisions the MACHINE made:
 * nobody pronounces a comma, and there is no way to hear a capital letter. A
 * checker run over that transcript will happily flag all three, and every one
 * of those findings bills the recogniser's choices to the learner — the exact
 * failure `voice/correction.ts` names for dialect forms, arriving by a
 * different road.
 *
 * So the category allowlist below is not tidying. It is the difference between
 * a grammar check and a lie about who wrote the text.
 *
 * Spoken language is also not written language: people speak in fragments,
 * abandon a clause and restart, and leave out what context supplies. Those are
 * not errors, they are how speech works, and a product that flags them teaches
 * somebody to talk like a document. The known offenders are excluded by rule
 * id, and that list is meant to GROW FROM OBSERVATION rather than from
 * guessing — see `SPOKEN_EXEMPT_RULES`.
 *
 * Pure: no I/O. The HTTP call lives in the route; this file maps and filters.
 */

/** What a finding is about, once the vendor's vocabulary is dropped. */
export type GrammarFinding = {
  /** The vendor's rule id, so a finding can be argued with and excluded. */
  ruleId: string;
  /** The vendor's category id, e.g. `GRAMMAR`. */
  category: string;
  /** The offending text, taken from the transcript by offset. */
  text: string;
  /** Character offset into the transcript. */
  offset: number;
  length: number;
  /** What to say instead. Empty when the checker has no suggestion. */
  replacements: string[];
  /** The checker's own explanation, in the checker's language. */
  message: string;
};

/**
 * The categories a SPOKEN take may be judged on.
 *
 * Everything absent from this list is absent for a reason a reader could
 * check:
 *
 *   TYPOS        spelling. You cannot hear a spelling. Whatever the checker
 *                found, the speaker did not do it.
 *   CASING       the recogniser decided every capital in the text.
 *   PUNCTUATION  nobody pronounces a comma.
 *   TYPOGRAPHY   quotation marks and dashes the speaker never uttered.
 *   STYLE        an opinion about register, not an error, and a learner
 *                working to get a sentence out does not need one.
 *   REDUNDANCY   the same, and doubly wrong for speech, where repetition is
 *                how people buy thinking time.
 *
 * What remains is the part a listener would actually notice: agreement, case,
 * verb placement, and words confused for one another.
 */
export const SPOKEN_CATEGORIES: readonly string[] = [
  "GRAMMAR",
  "AGREEMENT",
  "CONFUSED_WORDS",
  "VERBS",
  "NOUNS",
  "PREPOSITIONS",
  "COLLOCATIONS",
];

/**
 * Rules that are correct about writing and wrong about speech.
 *
 * DELIBERATELY SHORT, and meant to grow from watching real transcripts rather
 * than from imagining them. A long list assembled up front would be a list of
 * guesses wearing the authority of a constant — and the fleet already has the
 * rule that a capability is OBSERVED and not declared. Every addition should
 * cite the transcript that prompted it.
 */
export const SPOKEN_EXEMPT_RULES: readonly string[] = [
  // "This sentence does not start with an uppercase letter" — the recogniser
  // chose that, not the speaker. Belt to the CASING braces, because the rule
  // is filed under GRAMMAR in some LanguageTool versions.
  "UPPERCASE_SENTENCE_START",
  // Whitespace and double spaces are artefacts of how the transcript was
  // assembled from word tokens.
  "WHITESPACE_RULE",
  "DOUBLE_PUNCTUATION",
];

/** The shape LanguageTool answers with, narrowed to what is used. */
type LanguageToolMatch = {
  message?: unknown;
  offset?: unknown;
  length?: unknown;
  replacements?: unknown;
  rule?: { id?: unknown; category?: { id?: unknown } };
};

/**
 * Map a LanguageTool response into findings, keeping only what a speaker is
 * answerable for.
 *
 * Defensive about the body's shape rather than trusting it: this is a response
 * from a service that may be a different version than the one developed
 * against, and a missing field must drop one finding rather than throw away
 * the whole check.
 */
export function fromLanguageTool(
  body: unknown,
  transcript: string,
  options: { categories?: readonly string[]; exemptRules?: readonly string[] } = {},
): GrammarFinding[] {
  const categories = new Set(options.categories ?? SPOKEN_CATEGORIES);
  const exempt = new Set(options.exemptRules ?? SPOKEN_EXEMPT_RULES);

  const matches = (body as { matches?: unknown } | null)?.matches;
  if (!Array.isArray(matches)) return [];

  const findings: GrammarFinding[] = [];
  for (const raw of matches as LanguageToolMatch[]) {
    if (!raw || typeof raw !== "object") continue;

    const ruleId = typeof raw.rule?.id === "string" ? raw.rule.id : "";
    const category = typeof raw.rule?.category?.id === "string" ? raw.rule.category.id : "";
    if (!ruleId || !category) continue;
    if (!categories.has(category)) continue;
    if (exempt.has(ruleId)) continue;

    const offset = typeof raw.offset === "number" ? raw.offset : -1;
    const length = typeof raw.length === "number" ? raw.length : 0;
    if (offset < 0 || length <= 0 || offset + length > transcript.length) continue;

    const replacements = Array.isArray(raw.replacements)
      ? (raw.replacements as Array<{ value?: unknown }>)
          .map((r) => (typeof r?.value === "string" ? r.value : ""))
          .filter(Boolean)
          // Three is as many alternatives as anybody reads.
          .slice(0, 3)
      : [];

    findings.push({
      ruleId,
      category,
      text: transcript.slice(offset, offset + length),
      offset,
      length,
      replacements,
      message: typeof raw.message === "string" ? raw.message : "",
    });
  }

  return findings;
}

/**
 * How many findings one take may show.
 *
 * The same argument the model prompt makes for ONE improvement: somebody who
 * has just recorded themselves speaking a language they are bad at does not
 * need eleven corrections, they need the few that matter and the willingness
 * to press record again tomorrow. Ordered by position so the list reads with
 * the sentence rather than by a severity nobody defined.
 */
export const MAX_SHOWN = 3;

export function worthShowing(
  findings: readonly GrammarFinding[],
  limit = MAX_SHOWN,
): GrammarFinding[] {
  return [...findings].sort((a, b) => a.offset - b.offset).slice(0, limit);
}
