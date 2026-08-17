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
      jobId: "job_msigjtrw_99syy1",
      timeMin: 3,
      costUsd: 8,
      quality: 4.4,
      method: "Buy agent on Genesis → structured LP rebalance plan",
      outputTitle: "LP rebalance plan — PancakeSwap V3",
      outputSummary:
        "Range health, proposed bands, fee APR vs IL snapshot, gas-aware reset notes. Plan-only (no custody).",
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
      jobId: "job_msigk35r_lcneaa",
      timeMin: 3,
      costUsd: 8,
      quality: 4.3,
      method: "Buy agent on Genesis → yield reallocation brief",
      outputTitle: "Yield route brief — USDT BSC",
      outputSummary:
        "Ranked venues, risk notes, suggested splits, gas budget framing. Plan-only.",
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
      jobId: "job_msigk9fd_u6hnr5",
      timeMin: 3,
      costUsd: 8,
      quality: 4.5,
      method: "Buy agent on Genesis → HF protection plan",
      outputTitle: "Health factor protection plan",
      outputSummary:
        "Shock simulation, alert thresholds, repay vs collateral options. Security-weighted task.",
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
