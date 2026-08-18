import { CATEGORIES, type CategoryId } from "./categories";

export type JobChip = {
  id: string;
  label: string;
  categoryId: CategoryId;
  task: string;
};

export const JOB_CHIPS: JobChip[] = [
  {
    id: "lp-rebalance",
    label: "Rebalance my PCS LP",
    categoryId: "rebalancing",
    task: "Monitor my PCS V3 LP and propose rebalance bands when out of range",
  },
  {
    id: "grid-setup",
    label: "Set up a grid",
    categoryId: "grid-trading",
    task: "Design a grid between low and high with N levels on a BSC pair",
  },
  {
    id: "best-yield",
    label: "Find best yield",
    categoryId: "yield-optimisation",
    task: "Find highest safe APR venues for USDT on BSC under a gas budget",
  },
  {
    id: "hf-protect",
    label: "Protect health factor",
    categoryId: "health-factor",
    task: "Simulate HF after a −15% collateral shock and suggest repay vs add-collateral",
  },
];

const KEYWORDS: Record<CategoryId, string[]> = {
  rebalancing: [
    "rebalance",
    "lp",
    "liquidity",
    "range",
    "pancake",
    "pcs",
    "concentrated",
    "il",
    "fee apr",
  ],
  "grid-trading": [
    "grid",
    "dca",
    "levels",
    "market make",
    "market-making",
    "volatility",
    "band",
  ],
  "yield-optimisation": [
    "yield",
    "apr",
    "apy",
    "farm",
    "vault",
    "staking",
    "usdt",
    "route",
  ],
  "health-factor": [
    "health",
    "hf",
    "liquidat",
    "venus",
    "aave",
    "collateral",
    "repay",
    "borrow",
    "loan",
  ],
};

export function detectCategory(query: string): CategoryId | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let best: { id: CategoryId; hits: number } | null = null;
  for (const cat of CATEGORIES) {
    let hits = 0;
    for (const kw of KEYWORDS[cat.id]) {
      if (q.includes(kw)) hits += 1;
    }
    for (const kw of cat.keywords) {
      if (q.includes(kw.toLowerCase())) hits += 0.5;
    }
    if (!best || hits > best.hits) best = { id: cat.id, hits };
  }
  return best && best.hits > 0 ? best.id : null;
}
