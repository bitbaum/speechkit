# speechkit

Measure how somebody spoke — and say only what the evidence allows.

A learner records themselves speaking a language they are learning. speechkit tells them, from that recording:

- **how it went** — how long they spoke, how often and how long they paused, how long they went before stopping;
- **how fast** — speech rate and articulation rate, and what the *pair* suggests (have the words but hunting for them, or neither);
- **where they searched for a word** — "1.8 s before *Buch*": the word after a long pause is usually the one they were reaching for;
- **grammar a listener would notice** — "den Buch → das Buch", from your own LanguageTool, never spelling, casing or punctuation, which the recogniser decided and the speaker did not.

It will **not** give a pronunciation score. That is not a gap waiting to be filled: a score against a native ideal is a judgement about a person, and no improvement in speech recognition makes it honest. A test in this repo fails if an export ever starts to look like one.

Extracted from [Heidi](https://heidi.orangecat.ch), where it runs the speaking practice for Zurich German learners.

## Install

```bash
pnpm add github:bitbaum/speechkit#v1.0.0
```

`dist/` is committed, so a `github:` install needs no build step. npm (`@bitbaum/speechkit`) once the first publish is bootstrapped.

## The rule everything else follows

A transcript is evidence about a speaker's **words** only when the recogniser returns the variety that was **spoken**.

Swiss German recognition translates into Standard German — that is what every public corpus was built to do. A learner who says a flawless Zurich sentence gets back `ist` and `nicht`, none of which they said. Judging their grammar from that corrects the machine's German and bills it to the learner.

```ts
import { evidenceFrom, mayJudgeForm } from "@bitbaum/speechkit";

evidenceFrom({ available: true, returnsSpokenVariety: false, wer: 25.6 }); // "meaning-only"
evidenceFrom({ available: true, returnsSpokenVariety: true, wer: 6.4 });   // "words"
mayJudgeForm({ available: true, returnsSpokenVariety: true, wer: 22 });     // false — too many of its words are its own
```

So the same product is honest in both directions: on a dialect nothing transcribes faithfully, measure the signal and judge no forms; on a variety that is transcribed faithfully, measure the words too.

## Layers

| Layer | Needs | Exports |
|---|---|---|
| signal | raw samples | `measureDelivery`, `usable`, `MIN_PAUSE_MS` / `SEARCH_PAUSE_MS` / `STUCK_PAUSE_MS` |
| evidence | what the recogniser does | `evidenceFrom`, `mayJudgeForm`, `isFaithfulRendering` |
| words | a faithful transcript | `measureSpoken`, `hesitations`, `markerVerdict`, `measureFluency`, `countFilledPauses` |
| grammar | a faithful transcript + LanguageTool | `checkGrammar`, `fromLanguageTool`, `worthShowing` |
| practice design | nothing | `NATION_LADDER`, `trajectory`, `nextLimit` (4/3/2 task repetition) |

Every fact about a language is passed in: vowels and whether adjacent vowels merge (`SyllableRule`), filler words, dialect marker words, the LanguageTool code. Nothing in the package names a language — Heidi runs it on Zurich German and Ukrainian from the same code, and Ukrainian found a real bug (it has no diphthongs, so merging adjacent vowels undercounted syllables by a third).

## Where somebody searched for a word

```ts
import { measureDelivery, hesitations } from "@bitbaum/speechkit";

const delivery = measureDelivery(samples, sampleRate);      // on the device, from the audio
const found = hesitations(delivery.pauseSpans ?? [], words); // words: timings from your recogniser
// → [{ before: "Buch", index: 3, ms: 1800 }]
```

The pauses come from the **signal**, and the recogniser's timings only **name** them. Recognisers are poor clocks for silence: Whisper was observed stretching a one-syllable word across a 1.8 s pause and leaving no gap between words at all. The test for this uses the exact timings it returned.

Word timings: `transcribe({ words: true })` in [`@bitbaum/ai-kit`](https://github.com/bitbaum/ai-kit) ≥ 1.16.

## Grammar: run your own checker

```bash
docker run -d --name languagetool --restart unless-stopped \
  -p 127.0.0.1:8010:8010 -e Java_Xmx=1g --memory 1536m erikvl87/languagetool:6.8
```

`checkGrammar(text, "de-CH")` defaults to `http://127.0.0.1:8010`. Bind it to loopback: the server has no authentication, and the text is what somebody said out loud. Pointing `url` at the public API works and is a privacy decision to make — and disclose — on purpose. The package reads no environment.

`null` means **not checked** (the checker was down or slow); an empty `findings` means **checked, nothing a listener would notice**. Show them differently, or a page tells somebody their German was clean on the day the checker was off.

LanguageTool is partial and the page should say so. On German it catches agreement, case and verb forms (`ich gehen`, `den Buch`) and misses verb position after *weil*.

## The `§` references in the source

Comments cite sections of Heidi's design principles, which is where the reasoning was argued:

- **§3** — a *decision* (a threshold we chose and can defend) is labelled as one, never dressed up as a finding;
- **§6** — a model is never the sole judge of language the learner cannot audit; findings are deterministic, with a rule id you can argue with;
- **§7** — the state of Swiss German speech technology, measured rather than taken from vendors;
- **§8** — no false precision: no norms, no grades, no scores. Every number is reported as itself and compared only with the same learner's earlier takes.

## npm

Releases are tag-driven and tokenless (npm Trusted Publishing), the same as `ai-kit`. The first publish of a new package cannot be tokenless — npm will not trust a publisher for a package that does not exist yet — so it is done once by hand, by whoever holds the account's passkey:

```bash
npm login --auth-type=web            # approve in the browser with the passkey
npm publish --access public --provenance=false
# npmjs.com → @bitbaum/speechkit → Settings → Trusted Publisher:
#   GitHub Actions, bitbaum/speechkit, workflow publish.yml
npm logout
gh variable set NPM_PUBLISHING -b on --repo bitbaum/speechkit
```

From then on, `git tag vX.Y.Z && git push origin vX.Y.Z` publishes. Until then a tag's Publish run is green and says so.

## Develop

```bash
pnpm install
pnpm run verify   # format, lint, types, build, unit tests on the source, tests on dist/
```

CI fails if the committed `dist/` differs from what the source builds to.

## License

MIT
