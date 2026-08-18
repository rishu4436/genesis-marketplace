/**
 * Agent Advantage Report data — TermiX track requirement.
 * 3 tasks: with-agent vs without-agent (time, cost, quality).
 */

export type AdvantageTask = {
  id: string;
  title: string;
  category: string;
  /** High-stakes: trading | security | equities | defi-ops */
  stakes: "trading" | "security" | "defi-ops";
  taskBrief: string;
  without: {
    timeMin: number;
    costUsd: number;
    quality: number; // 1-5
    method: string;
    outputSummary: string;
  };
  withAgent: {
    agentName: string;
    genesisSlug: string;
    jobId?: string;
    timeMin: number;
    costUsd: number;
    quality: number;
    method: string;
    outputSummary: string;
    outputTitle: string;
  };
};

export const ADVANTAGE_TASKS: AdvantageTask[] = [
  {
    id: "lp-rebalance",
    title: "PCS V3 LP rebalance plan",
    category: "Rebalancing",
    stakes: "trading",
    taskBrief:
      "Propose new bands for a concentrated PCS V3 LP when price drifts out of range; include fee APR vs IL notes.",
    without: {
      timeMin: 40,
      costUsd: 0,
      quality: 2.5,
      method: "Manual spreadsheet + explorer tabs + Discord lore",
      outputSummary:
        "Rough ±range guess, no gas-aware reset plan, no structured IL vs fee comparison.",
    },
    withAgent: {
      agentName: "RangeKeeper",
      genesisSlug: "range-keeper",
      jobId: "job_msyi1iv8_weeu3q",
      timeMin: 3,
      costUsd: 8,
      quality: 4.4,
      method: "Hire RangeKeeper on Genesis · 2026-08-18 full analysis",
      outputTitle: "LP rebalance full analysis · CAKE-USDT (PCS V3)",
      outputSummary:
        "±6.5% working band, ~34% time-out-of-range, fee APR 22–30% vs ~1.4% IL, gas ≤ $2. Recommended reset. Open the live receipt.",
    },
  },
  {
    id: "best-yield",
    title: "Best yield for USDT on BSC",
    category: "Yield",
    stakes: "trading",
    taskBrief:
      "Rank safe-ish APR venues for USDT on BSC and propose a split under a modest gas budget.",
    without: {
      timeMin: 35,
      costUsd: 0,
      quality: 2.5,
      method: "Manual DeFiLlama + farm UI hopping",
      outputSummary:
        "Partial venue list, outdated APRs, no gas-budgeted reallocation plan.",
    },
    withAgent: {
      agentName: "YieldRouter",
      genesisSlug: "yield-router",
      jobId: "job_msyi1ltz_hocg2l",
      timeMin: 3,
      costUsd: 7,
      quality: 4.3,
      method: "Hire YieldRouter on Genesis · 2026-08-18 full analysis",
      outputTitle: "Yield route · USDT on BSC",
      outputSummary:
        "Venues ranked for $5,000 USDT. Barbell 75/15/10, 4–8% risk-adj APR, gas cap $4. Open the live receipt.",
    },
  },
  {
    id: "hf-shock",
    title: "HF −15% collateral shock",
    category: "Health factor",
    stakes: "security",
    taskBrief:
      "Simulate health factor after a 15% drop on collateral; recommend repay vs add-collateral before liquidation risk rises.",
    without: {
      timeMin: 40,
      costUsd: 0,
      quality: 2.5,
      method: "Manual calculator + protocol UI",
      outputSummary:
        "Single-point HF estimate, weak scenario table, no clear action ladder.",
    },
    withAgent: {
      agentName: "HealthSentinel",
      genesisSlug: "health-sentinel",
      jobId: "job_msyi1m7z_zmtich",
      timeMin: 3,
      costUsd: 6,
      quality: 4.5,
      method: "Hire HealthSentinel on Genesis · 2026-08-18 full analysis",
      outputTitle: "Health factor full analysis · Venus",
      outputSummary:
        "Baseline HF 1.45 → 1.25 at −15% shock. Soft 1.3 / hard 1.2. Stage repay now. Security-weighted. Open the live receipt.",
    },
  },
];

export function advantageTotals() {
  const withoutTime = ADVANTAGE_TASKS.reduce(
    (s, t) => s + t.without.timeMin,
    0,
  );
  const withTime = ADVANTAGE_TASKS.reduce(
    (s, t) => s + t.withAgent.timeMin,
    0,
  );
  const withoutCost = ADVANTAGE_TASKS.reduce(
    (s, t) => s + t.without.costUsd,
    0,
  );
  const withCost = ADVANTAGE_TASKS.reduce(
    (s, t) => s + t.withAgent.costUsd,
    0,
  );
  const withoutQ =
    ADVANTAGE_TASKS.reduce((s, t) => s + t.without.quality, 0) /
    ADVANTAGE_TASKS.length;
  const withQ =
    ADVANTAGE_TASKS.reduce((s, t) => s + t.withAgent.quality, 0) /
    ADVANTAGE_TASKS.length;

  return {
    withoutTime,
    withTime,
    timeSavedMin: withoutTime - withTime,
    withoutCost,
    withCost,
    withoutQ: Number(withoutQ.toFixed(2)),
    withQ: Number(withQ.toFixed(2)),
    qualityLift: Number((withQ - withoutQ).toFixed(2)),
  };
}
