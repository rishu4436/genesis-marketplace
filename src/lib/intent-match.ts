/**
 * Job-first intent matching: natural language / chips → ranked agents.
 */

import {
  CATEGORIES,
  type CategoryId,
  getCategory,
} from "./categories";
import {
  allGenesisAgents,
  genesisBuyHref,
  genesisHref,
  type GenesisAgent,
} from "./genesis-agents";

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

export type MatchedAgent = {
  agent: GenesisAgent;
  href: string;
  buyHref: string;
  score: number;
  reasons: string[];
  categoryId: CategoryId;
  categoryName: string;
};

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

export function matchAgentsForJob(
  query: string,
  limit = 3,
): {
  categoryId: CategoryId | null;
  categoryName: string | null;
  matches: MatchedAgent[];
  normalizedTask: string;
} {
  const q = query.trim();
  const categoryId = detectCategory(q);
  const agents = allGenesisAgents();

  const scored = agents.map((agent) => {
    let score = 10;
    const reasons: string[] = [];

    if (categoryId && agent.categoryId === categoryId) {
      score += 50;
      reasons.push(`Best fit for ${getCategory(categoryId)?.shortName}`);
    } else if (categoryId) {
      score += 5;
    }

    const blob = `${agent.name} ${agent.tagline} ${agent.description} ${agent.skills.join(" ")}`.toLowerCase();
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    let wordHits = 0;
    for (const w of words) {
      if (blob.includes(w)) wordHits += 1;
    }
    score += Math.min(25, wordHits * 4);
    if (wordHits > 0) reasons.push("Matches your brief keywords");

    if (agent.x402) {
      score += 5;
      reasons.push("x402 payment ready");
    }
    if (agent.pcsRelated && (categoryId === "rebalancing" || categoryId === "yield-optimisation")) {
      score += 8;
      reasons.push("PancakeSwap-aware");
    }

    score += Math.max(0, 10 - agent.etaMinutes); // faster agents edge up
    reasons.push(`~${agent.etaMinutes}m · $${agent.basePriceUsd}`);

    return {
      agent,
      href: genesisHref(agent),
      buyHref: genesisBuyHref(agent),
      score,
      reasons: reasons.slice(0, 3),
      categoryId: agent.categoryId,
      categoryName: getCategory(agent.categoryId)?.name || agent.categoryId,
    } satisfies MatchedAgent;
  });

  scored.sort((a, b) => b.score - a.score);

  // Prefer chip task if query matches a chip
  const chip = JOB_CHIPS.find(
    (c) =>
      c.label.toLowerCase() === q.toLowerCase() ||
      c.task.toLowerCase() === q.toLowerCase(),
  );
  const normalizedTask =
    chip?.task ||
    q ||
    (categoryId
      ? JOB_CHIPS.find((c) => c.categoryId === categoryId)?.task || q
      : q);

  return {
    categoryId,
    categoryName: categoryId ? getCategory(categoryId)?.name || null : null,
    matches: scored.slice(0, limit),
    normalizedTask,
  };
}
