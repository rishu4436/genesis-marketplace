export type CategoryId =
  | "rebalancing"
  | "grid-trading"
  | "yield-optimisation"
  | "health-factor";

export type Category = {
  id: CategoryId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  /** Semantic + keyword queries used against 8004scan */
  searchQueries: string[];
  keywords: string[];
  icon: string;
  accent: string;
  /** What the agent does (hackathon brief) */
  agentDoes: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "rebalancing",
    name: "Rebalancing",
    shortName: "Rebalance",
    tagline: "LP ranges that stay in the money",
    description:
      "Agents that manage liquidity provider ranges and reset positions automatically so your capital stays efficient.",
    agentDoes: "Manages LP ranges, resets positions automatically",
    searchQueries: [
      "liquidity rebalancing LP range management PancakeSwap",
      "rebalance liquidity provider position",
    ],
    keywords: [
      "rebalanc",
      "liquidity",
      "lp range",
      "concentrated",
      "position manag",
      "pancake",
    ],
    icon: "◎",
    accent: "from-amber-400 to-orange-500",
  },
  {
    id: "grid-trading",
    name: "Grid Trading",
    shortName: "Grid",
    tagline: "Automated grids that run without you",
    description:
      "Agents that place and manage automated grid orders across ranges so you capture volatility without babysitting the book.",
    agentDoes: "Places and manages automated grid orders",
    searchQueries: [
      "grid trading automated orders",
      "grid trading bot market making",
    ],
    keywords: ["grid", "grid trading", "market making", "dca", "range order"],
    icon: "▦",
    accent: "from-sky-400 to-blue-600",
  },
  {
    id: "yield-optimisation",
    name: "Yield Optimisation",
    shortName: "Yield",
    tagline: "Capital routes to the best APR",
    description:
      "Agents that move liquidity toward the highest available yield while staying within the rails you set.",
    agentDoes: "Routes liquidity to the highest available APR",
    searchQueries: [
      "yield optimisation farming APR",
      "yield aggregator vault staking",
    ],
    keywords: [
      "yield",
      "apr",
      "apy",
      "farm",
      "vault",
      "staking",
      "optim",
      "lista",
    ],
    icon: "▲",
    accent: "from-emerald-400 to-teal-600",
  },
  {
    id: "health-factor",
    name: "Health Factor Monitoring",
    shortName: "Health",
    tagline: "Protect loans before liquidation",
    description:
      "Agents that watch lending health factors and act before liquidation risk becomes irreversible.",
    agentDoes: "Protects lending positions from liquidation",
    searchQueries: [
      "health factor liquidation protection lending",
      "Aave Venus health factor monitor",
    ],
    keywords: [
      "health factor",
      "liquidation",
      "lending",
      "collateral",
      "aave",
      "venus",
      "borrow",
    ],
    icon: "✚",
    accent: "from-rose-400 to-red-600",
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function matchCategory(
  name: string,
  description: string,
): CategoryId | null {
  const hay = `${name} ${description}`.toLowerCase();
  let best: { id: CategoryId; score: number } | null = null;

  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (hay.includes(kw.toLowerCase())) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: cat.id, score };
    }
  }

  return best?.id ?? null;
}
