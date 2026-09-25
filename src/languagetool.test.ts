import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGrammar } from "./languagetool.ts";

/** A LanguageTool body with the shape the real server returned on the box. */
function lt(matches: unknown[]) {
  return new Response(JSON.stringify({ matches }), { status: 200 });
}

const agreement = (offset: number, length: number, value: string) => ({
  offset,
  length,
  message: "Möglicherweise fehlende grammatische Übereinstimmung.",
  replacements: [{ value }],
  rule: { id: "DE_AGREEMENT", category: { id: "GRAMMAR" } },
});

test("a finding a listener would notice comes back with its fix", async () => {
  const text = "Er hat den Buch gelesen.";
  const result = await checkGrammar(text, "de-CH", {
    fetchImpl: async () => lt([agreement(7, 8, "das Buch")]),
  });
  assert.ok(result);
  assert.equal(result.total, 1);
  assert.equal(result.findings[0]!.text, "den Buch");
  assert.deepEqual(result.findings[0]!.replacements, ["das Buch"]);
});

test("what the recogniser decided is never billed to the speaker", async () => {
  // Spelling, casing and punctuation are the machine's choices in a transcript.
  const text = "ich habe hunger";
  const result = await checkGrammar(text, "de-CH", {
    fetchImpl: async () =>
      lt([
        {
          offset: 0,
          length: 3,
          message: "",
          replacements: [{ value: "Ich" }],
          rule: { id: "UPPERCASE_SENTENCE_START", category: { id: "CASING" } },
        },
        {
          offset: 10,
          length: 5,
          message: "",
          replacements: [{ value: "Hunger" }],
          rule: { id: "GERMAN_SPELLER_RULE", category: { id: "TYPOS" } },
        },
      ]),
  });
  assert.deepEqual(result, { findings: [], total: 0 });
});

test("NOT CHECKED IS NOT CLEAN: a down checker is null, never []", async () => {
  // Otherwise the page tells somebody their German was flawless on the day the
  // checker was off.
  assert.equal(
    await checkGrammar("Ich gehen.", "de-CH", {
      fetchImpl: async () => new Response("boom", { status: 500 }),
    }),
    null,
  );
  assert.equal(
    await checkGrammar("Ich gehen.", "de-CH", {
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    }),
    null,
  );
});

test("a stalled checker is abandoned rather than holding the take hostage", async () => {
  const result = await checkGrammar("Ich gehen.", "de-CH", {
    timeoutMs: 20,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
  });
  assert.equal(result, null);
});

test("nothing said needs no checker", async () => {
  let called = false;
  const result = await checkGrammar("  ", "de-CH", {
    fetchImpl: async () => {
      called = true;
      return lt([]);
    },
  });
  assert.deepEqual(result, { findings: [], total: 0 });
  assert.equal(called, false);
});

test("the default target is loopback, so a transcript does not leave the machine", async () => {
  let seen = "";
  await checkGrammar("Hallo.", "de-CH", {
    fetchImpl: async (url) => {
      seen = String(url);
      return lt([]);
    },
  });
  assert.match(seen, /^http:\/\/127\.0\.0\.1:\d+\/v2\/check$/);
});

test("the caller chooses where its checker is, and a trailing slash is harmless", async () => {
  let seen = "";
  await checkGrammar("Hallo.", "de-CH", {
    url: "http://127.0.0.1:9999/",
    fetchImpl: async (url) => {
      seen = String(url);
      return lt([]);
    },
  });
  assert.equal(seen, "http://127.0.0.1:9999/v2/check");
});

test("at most three are shown, in sentence order, and the total says how many there were", async () => {
  const text = "aaaa bbbb cccc dddd eeee";
  const result = await checkGrammar(text, "de-CH", {
    fetchImpl: async () =>
      lt([
        agreement(20, 4, "x"),
        agreement(0, 4, "x"),
        agreement(10, 4, "x"),
        agreement(5, 4, "x"),
      ]),
  });
  assert.ok(result);
  assert.equal(result.total, 4);
  assert.deepEqual(
    result.findings.map((f) => f.offset),
    [0, 5, 10],
  );
});
