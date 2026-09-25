import { fromLanguageTool, worthShowing, type GrammarFinding } from "./grammar.ts";

/**
 * The one HTTP call behind spoken-grammar findings: a LanguageTool server.
 *
 * `grammar.ts` is pure and decides what a speaker is answerable for; this is
 * the I/O it deliberately leaves to somebody else.
 *
 * RUN YOUR OWN CHECKER. The default is loopback on purpose. A learner's
 * sentence is what they said out loud, and LanguageTool is LGPL, a single Java
 * server, free per call and deterministic — so the right deployment is next to
 * the app, bound to 127.0.0.1, where the text goes no further than the
 * transcript already went. Pointing `url` at the public languagetool.org API
 * works, and is a privacy decision the caller must make — and disclose — on
 * purpose. This package reads no environment: the app decides where its
 * checker is.
 *
 * FAIL SOFT, AND SAY WHICH. `null` means "not checked" — the checker is down,
 * slow, or unreachable — and a page must say grammar was not checked. Empty
 * `findings` means "checked, nothing a listener would notice", which is a
 * result worth showing. Collapsing the two tells somebody their German was
 * clean on the day the checker was off.
 */

const DEFAULT_URL = "http://127.0.0.1:8010";

/**
 * A spoken sentence is short and the checker is local. Past this it is stuck,
 * and the transcript and fluency are already waiting on it.
 */
const TIMEOUT_MS = 4_000;

export type GrammarCheck = { findings: GrammarFinding[]; total: number } | null;

export async function checkGrammar(
  text: string,
  languageCode: string,
  options: { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<GrammarCheck> {
  if (!text.trim()) return { findings: [], total: 0 };

  const url = (options.url ?? DEFAULT_URL).replace(/\/$/, "");
  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);

  try {
    const res = await doFetch(`${url}/v2/check`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ language: languageCode, text }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const all = fromLanguageTool(await res.json(), text);
    // `total` is kept so the page can say "3 of 5" honestly rather than imply
    // the three shown were everything that was found.
    return { findings: worthShowing(all), total: all.length };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
