import type { CategoryId } from "./categories";
import type { Agent } from "./types";

/**
 * Genesis-operated reference sellers for the four hackathon categories.
 * These power equal-depth shelves and the hire demo path.
 * Optional chainId/tokenId pins a live ERC-8004 identity when you deploy via Agent Studio.
 */
export type GenesisAgent = {
  slug: string;
  categoryId: CategoryId;
  name: string;
  tagline: string;
  description: string;
  skills: string[];
  protocols: string[];
  x402: boolean;
  /** Relevant to PancakeSwap traders / LPs */
  pcsRelated: boolean;
  basePriceUsd: number;
  etaMinutes: number;
  riskDefault: "low" | "medium" | "high";
  /** Optional live ERC-8004 pin (override via env GENESIS_PIN_<SLUG>) */
  chainId?: number;
  tokenId?: string;
  /** Future ERC-8183 service base URL */
  serviceUrl?: string;
  accent: string;
  icon: string;
};

export const GENESIS_AGENTS: GenesisAgent[] = [
  {
    slug: "range-keeper",
    categoryId: "rebalancing",
    name: "RangeKeeper",
    tagline: "PCS V3 LP ranges that stay in the money",
    description:
      "Genesis reference agent for concentrated liquidity. Monitors PancakeSwap V3 positions, flags out-of-range liquidity, and proposes rebalance bands with fee APR vs IL context. Does not custody user funds — delivers actionable plans and simulation outputs.",
    skills: [
      "PCS V3 range monitor",
      "Rebalance band proposal",
      "Fee APR vs IL snapshot",
      "Gas-aware reset plan",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: true,
    basePriceUsd: 8,
    etaMinutes: 2,
    riskDefault: "medium",
    accent: "from-amber-400 to-orange-500",
    icon: "◎",
  },
  {
    slug: "gridwright",
    categoryId: "grid-trading",
    name: "Gridwright",
    tagline: "Automated grid plans on BSC pairs",
    description:
      "Genesis reference agent for grid trading. Designs multi-level grids between user bounds, sizes notional per level, and returns pause rules for drawdown. Execution stays with you or a future session key — Gridwright sells the strategy brief and fill simulation.",
    skills: [
      "Grid layout (N levels)",
      "Drawdown pause rules",
      "24h fill simulation",
      "Pair volatility bands",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: true,
    basePriceUsd: 10,
    etaMinutes: 3,
    riskDefault: "medium",
    accent: "from-sky-400 to-blue-600",
    icon: "▦",
  },
  {
    slug: "yield-router",
    categoryId: "yield-optimisation",
    name: "YieldRouter",
    tagline: "Route stable liquidity to stronger APR",
    description:
      "Genesis reference agent for yield optimisation on BSC. Compares venue APR for a given asset (PCS farms, lending, LST paths), scores risk bands, and proposes a reallocation under a gas budget. Read-first; no fund custody.",
    skills: [
      "Multi-venue APR scan",
      "Risk-banded ranking",
      "Gas-budget reallocation",
      "PCS farm awareness",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: true,
    basePriceUsd: 7,
    etaMinutes: 2,
    riskDefault: "low",
    accent: "from-emerald-400 to-teal-600",
    icon: "▲",
  },
  {
    slug: "health-sentinel",
    categoryId: "health-factor",
    name: "HealthSentinel",
    tagline: "Protect loans before liquidation",
    description:
      "Genesis reference agent for lending health. Simulates health-factor under collateral price shocks, suggests repay vs add-collateral options, and drafts alert thresholds. Built for Venus/Aave-style positions on BSC — advisory, not custodian.",
    skills: [
      "HF simulation",
      "Liquidation distance",
      "Repay vs collateral options",
      "Alert threshold plan",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: false,
    basePriceUsd: 6,
    etaMinutes: 2,
    riskDefault: "low",
    accent: "from-rose-400 to-red-600",
    icon: "✚",
  },
];

function envPin(slug: string): { chainId: number; tokenId: string } | null {
  const key = `GENESIS_PIN_${slug.replace(/-/g, "_").toUpperCase()}`;
  const raw = process.env[key];
  if (!raw) return null;
  const [c, t] = raw.split(":");
  if (!c || !t) return null;
  const chainId = Number(c);
  if (!Number.isFinite(chainId)) return null;
  return { chainId, tokenId: t };
}

export function getGenesisAgent(slug: string): GenesisAgent | undefined {
  const base = GENESIS_AGENTS.find((a) => a.slug === slug);
  if (!base) return undefined;
  const pin = envPin(slug);
  if (pin) return { ...base, ...pin };
  return base;
}

export function getGenesisAgentsByCategory(categoryId: CategoryId): GenesisAgent[] {
  return GENESIS_AGENTS.filter((a) => a.categoryId === categoryId).map((a) => {
    const pin = envPin(a.slug);
    return pin ? { ...a, ...pin } : a;
  });
}

export function allGenesisAgents(): GenesisAgent[] {
  return GENESIS_AGENTS.map((a) => {
    const pin = envPin(a.slug);
    return pin ? { ...a, ...pin } : a;
  });
}

export function isGenesisSlug(slug: string): boolean {
  return GENESIS_AGENTS.some((a) => a.slug === slug);
}

/** Present a Genesis agent as a marketplace Agent card shape */
export function genesisToAgentCard(g: GenesisAgent): Agent & {
  genesis_slug: string;
  genesis_verified: true;
} {
  return {
    id: `genesis:${g.slug}`,
    agent_id: g.tokenId
      ? `${g.chainId}:${g.tokenId}`
      : `genesis:${g.slug}`,
    token_id: g.tokenId || g.slug,
    chain_id: g.chainId ?? 56,
    name: g.name,
    description: g.description,
    image_url: null,
    is_verified: true,
    star_count: 12,
    supported_protocols: g.protocols,
    x402_supported: g.x402,
    total_score: 88,
    total_feedbacks: 4,
    average_score: 4.8,
    created_at: "2026-08-05T00:00:00Z",
    genesis_slug: g.slug,
    genesis_verified: true,
  };
}

export function genesisHref(g: GenesisAgent) {
  return `/genesis/${g.slug}`;
}
