/**
 * Task repetition: the one speaking exercise whose evidence is strong and
 * whose outcome measure is the thing this product already computes.
 *
 * THE EXERCISE. Nation's 4/3/2 (1989): tell the same thing three times, to a
 * fresh listener each time, in four minutes, then three, then two. Three
 * ingredients — repetition, a shrinking clock, a new audience. What is
 * reported is consistent and large: speaking rate rises across the three
 * deliveries, hesitations fall, and errors in the repeated parts fall with
 * them.
 *
 * WHY IT IS THE RIGHT EXERCISE FOR *THIS* PRODUCT, and not merely a good one:
 *
 *   The outcome the research measures IS `fluency.ts`. Speech rate and
 *   hesitation count are not a proxy we invented for something we cannot see —
 *   they are the published dependent variables, and we compute them from the
 *   learner's own recording. An exercise whose effect our own instrument
 *   measures is a closed loop, and there are very few of those in language
 *   learning.
 *
 * WHAT THE EVIDENCE DOES AND DOES NOT SUPPORT, kept apart because §3 requires
 * it and because the distinction is the whole honesty of the feature:
 *
 *   FACT        — the rise across deliveries WITHIN a session is robust and
 *                 replicated. That is what the learner will see here.
 *   HYPOTHESIS  — that it transfers: that a person who does this becomes
 *                 faster on a task they have never told before. This is the
 *                 contested part and the one that would matter most, and we
 *                 must not sell it as settled.
 *
 * So the copy says "you got faster at saying this" and never "you got more
 * fluent". The first is measured. The second is a claim about a person.
 *
 * THE CLOCK IS A PARAMETER. Four minutes of monologue is a classroom's budget,
 * not a phone's, and shorter ladders are in common use. The ladder is supplied
 * rather than hardcoded so a shorter one is a configuration and not a silent
 * departure from the design it came from.
 *
 * WHAT WE CANNOT REPRODUCE, said plainly: the third ingredient is a NEW
 * LISTENER each time, and a phone has none. A speaking round does — which is
 * the argument for running this inside a circle rather than alone, and the
 * reason this module is in the same product as the rounds.
 *
 * Pure: no I/O, no model, same input -> same output.
 */

import type { Fluency } from "./fluency.ts";

/** Nation's original ladder, in seconds. */
export const NATION_LADDER: readonly number[] = [240, 180, 120];

/**
 * A ladder that fits a phone: two minutes, then ninety seconds, then one.
 *
 * The same SHAPE — three deliveries, each shorter — at a third of the budget.
 * Offered as a named alternative rather than as a redefinition of the original,
 * because "we used 4/3/2" and "we used a scaled version of it" are different
 * sentences and only one of them is true here.
 */
export const POCKET_LADDER: readonly number[] = [120, 90, 60];

/** A ladder must shrink, or it is repetition without the pressure that drives it. */
export function isLadder(seconds: readonly number[]): boolean {
  if (seconds.length < 2) return false;
  for (let i = 1; i < seconds.length; i++) {
    if (!(seconds[i] < seconds[i - 1])) return false;
    if (!(seconds[i] > 0)) return false;
  }
  return Number.isFinite(seconds[0]) && seconds[0] > 0;
}

/** One delivery of the same content. */
export type Attempt = {
  /** Which delivery this is, from 0. */
  index: number;
  /** What the clock allowed, in seconds. */
  limitSeconds: number;
  fluency: Fluency;
};

export type Trend = "rose" | "fell" | "flat";

export type Trajectory = {
  /** How many deliveries were actually made. */
  deliveries: number;
  /** Speech rate at each delivery, in reading order. */
  speechRate: number[];
  /** Silent pauses at each delivery. */
  pauseCount: number[];
  /**
   * Speech rate on the last delivery over the first, as a ratio.
   *
   * 1.2 means a fifth faster. Null when there is nothing to compare, which is
   * the honest answer for a single take and prevents a "+0%" that looks like a
   * measurement of no change rather than an absence of one.
   */
  rateRatio: number | null;
  rateTrend: Trend;
  pauseTrend: Trend;
  /** Every rung of the ladder was climbed. */
  complete: boolean;
};

/**
 * Change worth reporting.
 *
 * Below this the difference is the measurement's own noise — the same person
 * saying the same sentence twice does not produce the same number — and
 * reporting it would congratulate somebody for nothing, which is what makes
 * every other number here untrustworthy.
 */
const RATE_NOISE = 0.05;
const PAUSE_NOISE = 2;

function trendOf(first: number, last: number, noise: number): Trend {
  if (last > first + noise) return "rose";
  if (last < first - noise) return "fell";
  return "flat";
}

/**
 * What happened across the deliveries.
 *
 * Attempts are sorted by index rather than trusted in order: they arrive from
 * a device-local list that a learner can delete from, and a reversed pair would
 * invert the finding while looking perfectly well-formed.
 */
export function trajectory(attempts: readonly Attempt[], ladder: readonly number[]): Trajectory {
  const ordered = [...attempts].sort((a, b) => a.index - b.index);
  const speechRate = ordered.map((a) => a.fluency.speechRate);
  const pauseCount = ordered.map((a) => a.fluency.pauseCount);

  const usable = ordered.length >= 2 && speechRate[0] > 0;
  const first = speechRate[0] ?? 0;
  const last = speechRate[speechRate.length - 1] ?? 0;

  return {
    deliveries: ordered.length,
    speechRate,
    pauseCount,
    rateRatio: usable ? Math.round((last / first) * 100) / 100 : null,
    rateTrend: usable ? trendOf(first, last, first * RATE_NOISE) : "flat",
    pauseTrend:
      ordered.length >= 2
        ? trendOf(pauseCount[0], pauseCount[pauseCount.length - 1], PAUSE_NOISE)
        : "flat",
    complete: ordered.length >= ladder.length,
  };
}

/**
 * What the clock should allow for the next delivery, or null when the ladder
 * is finished.
 */
export function nextLimit(done: number, ladder: readonly number[]): number | null {
  return done >= 0 && done < ladder.length ? ladder[done] : null;
}
