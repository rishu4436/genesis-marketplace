/**
 * Equal-depth packages for the four marketplace categories.
 */

import type { CategoryId } from "./categories";

export type CategoryDepth = {
  categoryId: CategoryId;
  sampleOutputTitle: string;
  sampleOutputBody: string;
  depthBullets: string[];
  pcsNote?: string;
  metrics: { label: string; value: string }[];
  buyerPromise: string;
};

export const CATEGORY_DEPTH: Record<CategoryId, CategoryDepth> = {
  rebalancing: {
    categoryId: "rebalancing",
    sampleOutputTitle: "Sample: PCS V3 range reset",
    sampleOutputBody:
      "Position out of range on CAKE-USDT 0.25%. Propose new band ±4.2% around mid, fee APR vs IL snapshot, and gas-aware reset steps. Plan only — no custody.",
    depthBullets: [
      "Range health vs current mid",
      "Proposed lower/upper ticks",
      "Fee APR vs IL framing",
      "Gas-aware reset checklist",
    ],
    pcsNote:
      "PancakeSwap LPs: smarter range management without putting user funds at risk.",
    metrics: [
      { label: "Typical ETA", value: "~2–3m" },
      { label: "From", value: "$8" },
      { label: "Rail", value: "Plan / ERC-8183" },
    ],
    buyerPromise: "Stay in range with a clear rebalance plan you execute yourself.",
  },
  "grid-trading": {
    categoryId: "grid-trading",
    sampleOutputTitle: "Sample: N-level grid layout",
    sampleOutputBody:
      "Geometric 12-level grid on a BSC pair, ~1.1% spacing, 50/50 inventory at mid, pause if drawdown exceeds your bound. Fill simulation for 24h vol.",
    depthBullets: [
      "Low / high bounds",
      "Level count & spacing",
      "Drawdown pause rule",
      "24h fill simulation sketch",
    ],
    metrics: [
      { label: "Typical ETA", value: "~2–4m" },
      { label: "From", value: "$8" },
      { label: "Rail", value: "Plan / ERC-8183" },
    ],
    buyerPromise: "A grid you can place without another spreadsheet weekend.",
  },
  "yield-optimisation": {
    categoryId: "yield-optimisation",
    sampleOutputTitle: "Sample: USDT venue ranking",
    sampleOutputBody:
      "Rank BSC venues for USDT by risk-adjusted APR, propose splits under a gas budget, flag farm vs lending tradeoffs. Includes PCS farm context where relevant.",
    depthBullets: [
      "Venue ranking table",
      "Risk-adjusted APR notes",
      "Suggested allocation splits",
      "Gas budget constraint",
    ],
    pcsNote:
      "PancakeSwap farms included when they clear risk-adjusted hurdles for LPs and depositors.",
    metrics: [
      { label: "Typical ETA", value: "~2–3m" },
      { label: "From", value: "$8" },
      { label: "Rail", value: "Plan / ERC-8183" },
    ],
    buyerPromise: "Capital routing brief — you keep keys, agent finds the route.",
  },
  "health-factor": {
    categoryId: "health-factor",
    sampleOutputTitle: "Sample: −15% shock ladder",
    sampleOutputBody:
      "Venus/Aave-style HF under a 15% collateral drop: projected HF, alert thresholds, repay vs add-collateral options ordered by urgency.",
    depthBullets: [
      "Current vs shocked HF",
      "Liquidation distance",
      "Repay vs collateral ladder",
      "Alert threshold recommendations",
    ],
    metrics: [
      { label: "Typical ETA", value: "~2–3m" },
      { label: "From", value: "$8" },
      { label: "Rail", value: "Plan / ERC-8183" },
    ],
    buyerPromise: "See liquidation risk early with actions you still control.",
  },
};

export function getCategoryDepth(id: CategoryId): CategoryDepth {
  return CATEGORY_DEPTH[id];
}
