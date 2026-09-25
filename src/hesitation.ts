/**
 * Where somebody hesitated — the signal's pauses, named by the transcript's words.
 *
 * `delivery.ts` knows exactly WHEN each silence was, from the audio. It does
 * not know what came next: the signal has no words. The transcript has the
 * words and only rough times. Joining the two turns "you stopped for 1.8 s"
 * into "you stopped for 1.8 s before *Buch*" — and the word after a long pause
 * is very often the one the learner was reaching for, which is something they
 * can act on.
 *
 * WHY THE PAUSES COME FROM THE SIGNAL AND NOT FROM GAPS BETWEEN WORDS.
 *
 * The first version of this file looked for gaps in the recogniser's word
 * timings. Its unit tests passed. Then a real take went through Groq's Whisper
 * — "Er hat den [1.8 s silence] Buch gelesen" — and came back as
 *
 *     den 1.28–1.84   Buch 1.84–4.14   gelesen 4.14–5.28
 *
 * with no gap anywhere: the recogniser stretched a one-syllable word across
 * the whole pause. Gap detection would never have fired on real speech. So the
 * signal decides WHETHER and WHERE there was a pause, and the words only NAME
 * it: the pause belongs to the word being spoken when sound resumed, which is
 * the word whose span reaches past the pause's end. That rule gives the same
 * answer whether the recogniser leaves a gap or swallows it, and the tests pin
 * both shapes — the second one with the exact timings Groq returned.
 *
 * Same recording, same clock: the page measures the very blob it uploads, so
 * the two timelines share an origin.
 *
 * NO JUDGEMENT, NO TOTALS. The counts belong to the signal (`spoken.ts`); this
 * only names places. A pause before a hard word is what speaking a second
 * language sounds like, and native speakers do it too.
 *
 * Pure: no I/O, no model, same input -> same output.
 */

import { SEARCH_PAUSE_MS, type PauseSpan } from "./pause.ts";
import type { TimedWord } from "./fluency.ts";

/** As many places as anybody reads after one take. */
export const MAX_HESITATIONS = 3;

export type Hesitation = {
  /** The word being spoken when sound resumed — usually the one reached for. */
  before: string;
  /** Index of that word in the timed list. */
  index: number;
  /** The pause, in ms, as the SIGNAL measured it. */
  ms: number;
};

/** Trailing punctuation is the recogniser's, not something the learner said. */
const bare = (word: string) => word.replace(/[.,!?;:…»«"„“”]+$/u, "").replace(/^[«"„“]+/u, "");

export function hesitations(
  pauses: readonly PauseSpan[],
  words: readonly TimedWord[],
  limit = MAX_HESITATIONS,
): Hesitation[] {
  const found: Hesitation[] = [];
  for (const pause of pauses) {
    const ms = pause.endMs - pause.startMs;
    // Searching, not merely breathing — see SEARCH_PAUSE_MS in pause.ts.
    if (ms < SEARCH_PAUSE_MS) continue;
    const resumedAt = pause.endMs / 1000;
    // The first word still going on (or yet to start) when sound came back.
    const index = words.findIndex((w) => w.end > resumedAt);
    if (index < 0) continue; // a pause after the last recognised word names nothing
    const word = bare(words[index]!.word);
    if (!word) continue;
    found.push({ before: word, index, ms: Math.round(ms) });
  }
  // Longest first to choose, then back into sentence order to read.
  return found
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index);
}
