/**
 * TermiX Agent Advantage Report — four real tasks (one per official job), with vs without.
 * Trading + security weighted. Linked to live receipts. No invented PnL.
 */

export type AdvantageTask = {
  id: string;
  title: string;
  category: string;
  stakes: "trading" | "security";
  weight: number;
  taskBrief: string;
  diyMissed: string[];
  agentProof: string[];
  without: {
    timeMin: number;
    costUsd: number;
    quality: number;
    method: string;
    outputSummary: string;
  };
  withAgent: {
    agentName: string;
    genesisSlug: string;
    jobId: string;
    timeMin: number;
    /** Plan charged amount — always 0 on Genesis soft hire. */
    costUsd: number;
    /** Catalog SKU label only — not a charge. */
    skuUsd: number;
    quality: number;
    method: string;
    outputTitle: string;
    outputSummary: string;
  };
};

export const ADVANTAGE_TASKS: AdvantageTask[] = [
  {
    id: "lp-rebalance",
    title: "PCS V3 CAKE/USDT — out of range, no band plan",
    category: "Rebalancing",
    stakes: "trading",
    weight: 1.2,
    taskBrief:
      "Concentrated CAKE/USDT LP is out of range. Propose a fee-first band, IL vs fee, and a gas-capped reset. Do not touch the NFT.",
    diyMissed: [
      "No tick / slot0 — guessed the band from a chart screenshot",
      "No fee-vs-IL ratio — kept a wide range that leaked fees",
      "No gas cap — two failed resets on BSC peak gas",
      "No abort rule if TVL or tick jumps during the mint",
    ],
    agentProof: [
      "Typed band + IL vs in-range fee APR",
      "Gas budget and abort conditions",
      "Shareable receipt with spec/output hashes",
      "On-chain slot0 section when BSC RPC answers",
    ],
    without: {
      timeMin: 48,
      costUsd: 0,
      quality: 2.0,
      method: "Operator-timed baseline (not an independent third party): explorer + Discord + spreadsheet",
      outputSummary:
        "A guessed ±10% band, no IL math, no gas abort. DIY either stays out of range or over-trades the NFT.",
    },
    withAgent: {
      agentName: "RangeKeeper",
      genesisSlug: "range-keeper",
      jobId: "job_mtphh1fs_hvnpd7",
      timeMin: 1,
      costUsd: 0,
      skuUsd: 8,
      quality: 4.5,
      method: "Genesis hire 2026-09-06 · RangeKeeper full analysis · live receipt below",
      outputTitle: "LP rebalance full analysis · CAKE-USDT (PCS V3)",
      outputSummary:
        "Working band, time-out-of-range, fee APR vs IL, gas ≤ $2, reset recommendation. Open the receipt — do not take our word.",
    },
  },
  {
    id: "grid-book",
    title: "BNB/USDT grid — 14 levels, no pause rule",
    category: "Grid trading",
    stakes: "trading",
    weight: 1.2,
    taskBrief:
      "Design a geometric 14-level BNB/USDT grid with a hard drawdown pause. Plan only — you place the orders.",
    diyMissed: [
      "Arithmetic spacing that bunches inventory at the worst tick",
      "No DD pause — grid kept buying a 8% dump",
      "No per-level notional — over-sized the wings",
      "No 24h fill sketch — expected fills that never happen in a range",
    ],
    agentProof: [
      "Geometric levels + spacing from the brief",
      "Explicit DD pause / resume rule",
      "Per-level notional and inventory split",
      "Live BNB/USDT slot0 on the receipt (window = this hire, not a backtest PnL)",
    ],
    without: {
      timeMin: 42,
      costUsd: 0,
      quality: 2.1,
      method: "Operator-timed baseline (not independent): TradingView + a CEX grid UI copied onto BSC",
      outputSummary:
        "A pretty ladder with no kill switch. DIY looks fine until volatility expands and the book is one-sided.",
    },
    withAgent: {
      agentName: "Gridwright",
      genesisSlug: "gridwright",
      jobId: "job_mtphh262_191700",
      timeMin: 1,
      costUsd: 0,
      skuUsd: 10,
      quality: 4.3,
      method: "Genesis hire 2026-09-06 · Gridwright full analysis · live receipt below",
      outputTitle: "Grid layout · BSC pair",
      outputSummary:
        "Level count, geometric spacing, DD pause, fill sketch. You still place orders. The plan is the product.",
    },
  },
  {
    id: "hf-shock",
    title: "Venus HF 1.38 — −18% collateral, no ladder",
    category: "Health factor",
    stakes: "security",
    weight: 1.4,
    taskBrief:
      "HF ≈ 1.38. Simulate −18% collateral. Soft / hard alerts. Repay vs add-collateral. Advisory only — one missed step is liquidation.",
    diyMissed: [
      "Single-point HF, no shock table",
      "No soft/hard thresholds — reacted after the oracle move",
      "No repay vs collateral sizing",
      "Looked at USD price, not protocol HF after interest",
    ],
    agentProof: [
      "Shock path with alert levels",
      "Repay vs add-collateral ladder",
      "Security-weighted: liquidation distance first",
      "Live receipt — not a screenshot of a calculator",
    ],
    without: {
      timeMin: 45,
      costUsd: 0,
      quality: 1.8,
      method: "Operator-timed baseline (not independent): protocol UI + a HF formula from a blog post",
      outputSummary:
        "One number, no ladder. DIY finds out it was wrong when the position is gone.",
    },
    withAgent: {
      agentName: "HealthSentinel",
      genesisSlug: "health-sentinel",
      jobId: "job_mtphh38g_l69uoy",
      timeMin: 1,
      costUsd: 0,
      skuUsd: 6,
      quality: 4.6,
      method: "Genesis hire 2026-09-06 · HealthSentinel full analysis · live receipt below",
      outputTitle: "Health factor full analysis · Venus",
      outputSummary:
        "Baseline → shock HF, soft/hard alerts, staged repay. Security-weighted. Open the receipt.",
    },
  },
  {
    id: "usdt-yield",
    title: "Park USDT on BSC — no venue split",
    category: "Yield optimisation",
    stakes: "trading",
    weight: 1.2,
    taskBrief:
      "Park 1800 USDT on BSC. Rank liquid lending vs a PCS farm sleeve under a $2.50 gas budget. 36h recheck. No deposits — plan only.",
    diyMissed: [
      "Copied a farm APY screenshot with no risk band",
      "Ignored Venus supply rate on-chain vs advertised farm APR",
      "No gas budget — two rotations ate the week's yield",
      "No dry-powder sleeve — 100% in one venue",
    ],
    agentProof: [
      "Risk-banded venue ranking, not a single APY",
      "On-chain Venus rate when RPC answers",
      "Split + dry powder + recheck window",
      "Hashed receipt you can show a third party",
    ],
    without: {
      timeMin: 40,
      costUsd: 0,
      quality: 2.0,
      method: "Operator-timed baseline (not independent): farm UI + a public APR thread",
      outputSummary:
        "Chased the loudest farm APR. DIY either overpays gas or sits in a venue that compressed overnight.",
    },
    withAgent: {
      agentName: "YieldRouter",
      genesisSlug: "yield-router",
      jobId: "job_mtphh2ss_6dken9",
      timeMin: 1,
      costUsd: 0,
      skuUsd: 7,
      quality: 4.2,
      method: "Genesis hire 2026-09-06 · YieldRouter full analysis · live receipt below",
      outputTitle: "Yield route brief · USDT on BSC",
      outputSummary:
        "Ranked venues, suggested split, gas cap. You still deposit. The plan is the product.",
    },
  },
];

export function advantageHrefForHire(opts: {
  genesisSlug?: string;
  categoryId?: string | null;
}): string {
  const slug = opts.genesisSlug;
  const cat = opts.categoryId;
  if (slug === "range-keeper" || cat === "rebalancing") {
    return "/advantage#lp-rebalance";
  }
  if (slug === "gridwright" || cat === "grid-trading") {
    return "/advantage#grid-book";
  }
  if (slug === "health-sentinel" || cat === "health-factor") {
    return "/advantage#hf-shock";
  }
  if (slug === "yield-router" || cat === "yield-optimisation") {
    return "/advantage#usdt-yield";
  }
  return "/advantage";
}

export function advantageTotals() {
  const wsum = ADVANTAGE_TASKS.reduce((s, t) => s + t.weight, 0);
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
  const skuUsd = ADVANTAGE_TASKS.reduce(
    (s, t) => s + t.withAgent.skuUsd,
    0,
  );
  const withoutQ =
    ADVANTAGE_TASKS.reduce((s, t) => s + t.without.quality * t.weight, 0) /
    wsum;
  const withQ =
    ADVANTAGE_TASKS.reduce((s, t) => s + t.withAgent.quality * t.weight, 0) /
    wsum;

  return {
    withoutTime,
    withTime,
    timeSavedMin: withoutTime - withTime,
    withoutCost,
    withCost,
    skuUsd,
    withoutQ: Number(withoutQ.toFixed(2)),
    withQ: Number(withQ.toFixed(2)),
    qualityLift: Number((withQ - withoutQ).toFixed(2)),
    securityWeight: ADVANTAGE_TASKS.find((t) => t.stakes === "security")?.weight,
    tradingWeight: ADVANTAGE_TASKS.filter((t) => t.stakes === "trading").reduce(
      (s, t) => s + t.weight,
      0,
    ),
  };
}
