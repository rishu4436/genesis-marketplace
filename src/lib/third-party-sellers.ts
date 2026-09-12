/**
 * Third-party (not By Genesis) sellers we can actually reach.
 * Featured pin is the judge-proof hire. Other catalog agents may
 * resolve from 8004scan a2a_endpoint at hire time.
 */

import type { CategoryId } from "./categories";
import type { Agent } from "./types";

export type ThirdPartySeller = {
  slug: string;
  name: string;
  chainId: number;
  tokenId: string;
  categoryId: CategoryId;
  tagline: string;
  description: string;
  a2aCardUrl: string;
  /** JSON-RPC A2A URL when it is not the card origin. */
  rpcUrl?: string;
  restBase?: string;
  /** A2A skill this pin sells (Brain negotiate `service`). */
  skillId?: string;
  /** Public measured sample from the operator — not an escrowed job. */
  exampleUrl?: string;
  ownerAddress: string;
  featured?: boolean;
  /** Published ERC-8183 list quote in $U. Omit when the seller has not stated one. */
  listPriceU?: number;
};

export const FEATURED_SELLERS: ThirdPartySeller[] = [
  {
    slug: "bnb-lp-rebalancer",
    name: "BNB LP Range Rebalancer",
    chainId: 56,
    tokenId: "265375",
    categoryId: "rebalancing",
    tagline: "Live PCS V3 BNB/USDT rebalancer · A2A + operator API",
    description:
      "Autonomous PancakeSwap V3 BNB/USDT concentrated-liquidity range rebalancer. Sells live position reports over A2A + ERC-8183.",
    a2aCardUrl:
      "https://bnb-lp.172-104-171-139.nip.io/.well-known/agent-card.json",
    restBase: "https://bnb-lp-api.172-104-171-139.nip.io",
    ownerAddress: "0x20f1ca5d1e5a3ee94c29dbf95e6bf6cea6a8d64b",
    featured: true,
  },
  {
    slug: "brain-grid-planner",
    name: "Brain on BNB — BSC Grid Planner",
    chainId: 56,
    tokenId: "302258",
    categoryId: "grid-trading",
    tagline: "Grid spacing from pool fees, impact, and transfer tax · 0.1 $U",
    listPriceU: 0.1,
    description:
      "Grid levels for a BNB Chain pool with round-trip cost measured from the pool (fee, impact, transfer tax). Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "grid_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=grid_plan",
    ownerAddress: "0x73809f69916fcf7ddc5bb1315fbdf96a569a5963",
    featured: true,
  },
  {
    slug: "brain-venus-yield",
    name: "Brain on BNB — Venus Yield Ranking",
    chainId: 56,
    tokenId: "304493",
    categoryId: "yield-optimisation",
    tagline: "Venus core-pool APY ranked from on-chain rates · 0.1 $U",
    listPriceU: 0.1,
    description:
      "Every Venus core-pool market ranked by supply APY from rate-per-block and measured block time. Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "yield_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=yield_plan",
    ownerAddress: "0x73809f69916fcf7ddc5bb1315fbdf96a569a5963",
    featured: true,
  },
  {
    slug: "brain-venus-hf",
    name: "Brain on BNB — Venus Health Factor Monitor",
    chainId: 56,
    tokenId: "302257",
    categoryId: "health-factor",
    tagline: "Venus HF and liquidation distance from Comptroller · 0.1 $U",
    listPriceU: 0.1,
    description:
      "Health factor for a Venus position, computed market by market from the Comptroller, with a stress table. Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "health_factor",
    exampleUrl: "https://agent.brainonbnb.com/example?service=health_factor",
    ownerAddress: "0x73809f69916fcf7ddc5bb1315fbdf96a569a5963",
    featured: true,
  },
  {
    slug: "brain-rebalance-pricer",
    name: "Brain on BNB — Portfolio Rebalance Pricer",
    chainId: 56,
    tokenId: "304494",
    categoryId: "rebalancing",
    tagline: "Swap cost of a rebalance measured from the pools · 0.1 $U",
    listPriceU: 0.1,
    description:
      "The swaps that move a BSC portfolio to target weights, each costed against its own pool (fee, impact, transfer tax). Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "rebalance_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=rebalance_plan",
    ownerAddress: "0x73809f69916fcf7ddc5bb1315fbdf96a569a5963",
    featured: true,
  },
  {
    slug: "brain-pcs-fee-tier",
    name: "Brain on BNB — PancakeSwap Fee Tier Placement",
    chainId: 56,
    tokenId: "310460",
    categoryId: "yield-optimisation",
    tagline: "Which PCS fee tier actually paid LPs in the live window · 0.1 $U",
    listPriceU: 0.1,
    description:
      "Measures PancakeSwap V2/V3 fee tiers over a live window: turnover, fees paid, and what your size would have earned. Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "lp_tier_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=lp_tier_plan",
    ownerAddress: "0x73809f69916fcf7ddc5bb1315fbdf96a569a5963",
    featured: true,
  },
];

/**
 * Extra live A2A we probed (Brain /find + negotiate 200).
 * Hireable, not a labeled featured slot.
 */
export const EXTRA_LIVE_SELLERS: ThirdPartySeller[] = [
  {
    slug: "chainhelix-rebalancer",
    name: "ChainHelix — Portfolio Rebalancer",
    chainId: 56,
    tokenId: "269223",
    categoryId: "rebalancing",
    tagline: "ERC-8183 A2A rebalancer · negotiate + notify_funded",
    description:
      "ERC-8183 seller (rebalancer-agent). Quotes a rebalance over A2A. Not operated by Genesis.",
    a2aCardUrl:
      "https://agents.chainhelix.io/rebalancer/.well-known/agent-card.json",
    rpcUrl: "https://agents.chainhelix.io/rebalancer/",
    skillId: "rebalancing",
    ownerAddress: "",
  },
  {
    slug: "chainhelix-grid",
    name: "ChainHelix — Grid Trader",
    chainId: 56,
    tokenId: "269224",
    categoryId: "grid-trading",
    tagline: "ERC-8183 A2A grid seller · negotiate + notify_funded",
    description:
      "ERC-8183 seller (gridtrader-agent). Quotes a grid job over A2A. Not operated by Genesis.",
    a2aCardUrl:
      "https://agents.chainhelix.io/gridtrader/.well-known/agent-card.json",
    rpcUrl: "https://agents.chainhelix.io/gridtrader/",
    skillId: "grid",
    ownerAddress: "0xb8143345687aa5a527f4f9568d508ebbc612d06d",
  },
  {
    slug: "chainhelix-health",
    name: "ChainHelix — Health Factor Monitor",
    chainId: 56,
    tokenId: "269228",
    categoryId: "health-factor",
    tagline: "ERC-8183 A2A health-factor seller · negotiate + notify_funded",
    description:
      "ERC-8183 seller (healthmon-agent). Quotes a health-factor job over A2A. Not operated by Genesis.",
    a2aCardUrl:
      "https://agents.chainhelix.io/healthmon/.well-known/agent-card.json",
    rpcUrl: "https://agents.chainhelix.io/healthmon/",
    skillId: "health",
    ownerAddress: "0x91f4602760e1627007bfc16f78a74cf8b9de8da2",
  },
  {
    slug: "bnb-yield-optimizer",
    name: "BNB Yield Optimizer",
    chainId: 56,
    tokenId: "265876",
    categoryId: "yield-optimisation",
    tagline: "Live Venus/PCS yield scanner · A2A + operator API",
    description:
      "Scans BSC lending and liquidity protocols and reports risk-adjusted yield. Sells over A2A + operator REST. Not operated by Genesis.",
    a2aCardUrl:
      "https://bnb-yield.172-104-171-139.nip.io/.well-known/agent-card.json",
    rpcUrl: "https://bnb-yield.172-104-171-139.nip.io/a2a",
    restBase: "https://bnb-yield.172-104-171-139.nip.io",
    skillId: "negotiate",
    ownerAddress: "0xa09991fc5D8637bb4245737C3ebF26E24D653962",
  },
  {
    slug: "bnb-lending-guardian",
    name: "BNB Lending Guardian",
    chainId: 56,
    tokenId: "266933",
    categoryId: "health-factor",
    tagline: "Live Venus liquidation guardian · A2A + operator API",
    description:
      "Monitors Venus lending positions and reports liquidation risk. Sells over A2A + operator REST. Not operated by Genesis.",
    a2aCardUrl:
      "https://bnb-guardian.172-104-171-139.nip.io/.well-known/agent-card.json",
    rpcUrl: "https://bnb-guardian.172-104-171-139.nip.io/a2a",
    restBase: "https://bnb-guardian.172-104-171-139.nip.io",
    skillId: "negotiate",
    ownerAddress: "0xa09991fc5D8637bb4245737C3ebF26E24D653962",
  },
  {
    slug: "marketplace-grid-planner",
    name: "Marketplace Grid Planner",
    chainId: 56,
    tokenId: "303779",
    categoryId: "grid-trading",
    tagline: "Deterministic grid plan · no custody · live A2A",
    description:
      "Marketplace-operated grid seller. Computes deterministic grid plans and performs no trading or custody. Hireable over A2A + ERC-8183. Not operated by Genesis.",
    a2aCardUrl:
      "https://bnb-agent-marketplace-ruby.vercel.app/grid/.well-known/agent-card.json",
    rpcUrl: "https://bnb-agent-marketplace-ruby.vercel.app/api/sellers/grid/a2a",
    skillId: "negotiate",
    ownerAddress: "0xa2a2012e52fd075c0f3146e37e833e7294ee52b5",
  },
  {
    slug: "smeai-grid",
    name: "SMEAI Reference Grid Viability Checker",
    chainId: 56,
    tokenId: "331794",
    categoryId: "grid-trading",
    tagline: "PCS V3 grid step vs round-trip cost · live A2A",
    description:
      "Reads a PancakeSwap V3 pool on BSC mainnet and works out whether a proposed grid step covers its own costs. A full cycle pays the pool fee twice, so any step below that loses money. Hireable over A2A. Not operated by Genesis.",
    a2aCardUrl: "https://smeai-dev.vercel.app/api/a2a/grid",
    rpcUrl: "https://smeai-dev.vercel.app/api/a2a/grid",
    skillId: "grid_viability",
    ownerAddress: "0x4cda2a93054f2ab639b4a95c261874a77a0af6fa",
  },
  {
    slug: "smeai-health",
    name: "SMEAI Reference Health Factor Monitor",
    chainId: 56,
    tokenId: "331625",
    categoryId: "health-factor",
    tagline: "Venus HF from Comptroller + oracle · live A2A",
    description:
      "Reads a wallet's Venus position on BSC mainnet and returns its real health factor — weighted collateral over debt, priced by the Venus oracle. Hireable over A2A. Not operated by Genesis.",
    a2aCardUrl: "https://smeai-dev.vercel.app/api/a2a",
    rpcUrl: "https://smeai-dev.vercel.app/api/a2a",
    skillId: "health_factor",
    ownerAddress: "0x4cda2a93054f2ab639b4a95c261874a77a0af6fa",
  },
  {
    slug: "hallmark-range-keeper",
    name: "PancakeSwap v3 Range Keeper",
    chainId: 56,
    tokenId: "338475",
    categoryId: "rebalancing",
    tagline: "PCS V3 range still-earns check + reset · live A2A",
    description:
      "Watches a PancakeSwap v3 liquidity position, decides whether its range still earns, and resets it when it does not. Hireable over A2A. Not operated by Genesis.",
    a2aCardUrl: "https://hallmark-agents.vercel.app/a2a/rebalancer",
    rpcUrl: "https://hallmark-agents.vercel.app/a2a/rebalancer",
    skillId: "analyse",
    ownerAddress: "0x38c6fc4a5525b37f9545423a7132157f69ce08da",
  },
  {
    slug: "lingoai-health",
    name: "LingoAI Health Factor Sentinel",
    chainId: 56,
    tokenId: "340458",
    categoryId: "health-factor",
    tagline: "Loan HF + liquidation price · ERC-8183 A2A",
    description:
      "Compute a loan's health factor and the price move that would liquidate it. Deterministic and hireable, settled through ERC-8183 escrow. Not operated by Genesis.",
    a2aCardUrl:
      "https://holon.lingoai.io/agents/health-factor/.well-known/agent-card.json",
    rpcUrl: "https://holon.lingoai.io/agents/health-factor/a2a",
    skillId: "health-factor",
    ownerAddress: "0x0683406742c8e5fda38692bda855e72676ccdda6",
  },
  {
    slug: "hallmark-liquidation-guard",
    name: "Venus Liquidation Guard",
    chainId: 56,
    tokenId: "338480",
    categoryId: "health-factor",
    tagline: "Venus HF threshold + repay-to-margin · live A2A",
    description:
      "Watches a Venus position, computes its health and the exact price at which it liquidates, and repays precisely enough to restore a target margin when it crosses a threshold. Hireable over A2A. Not operated by Genesis.",
    a2aCardUrl: "https://hallmark-agents.vercel.app/a2a/health",
    rpcUrl: "https://hallmark-agents.vercel.app/a2a/health",
    skillId: "analyse",
    ownerAddress: "0x38c6fc4a5525b37f9545423a7132157f69ce08da",
  },
  {
    slug: "healthguard",
    name: "HealthGuard",
    chainId: 56,
    tokenId: "259573",
    categoryId: "health-factor",
    tagline: "Loan watch + repay before liquidation · live A2A",
    description:
      "Watches your loan health factor and repays before the position can be liquidated. Hireable over A2A. Not operated by Genesis.",
    a2aCardUrl:
      "https://bnb-agent-market.vercel.app/agents/healthguard/.well-known/agent-card.json",
    rpcUrl:
      "https://bnb-agent-market.vercel.app/agents/healthguard/.well-known/agent-card.json",
    skillId: "protect",
    ownerAddress: "0xfb19e30a2b29872cdb513ba77407ee5b4fd3c4c4",
  },
];

export const LIVE_SELLERS: ThirdPartySeller[] = [
  ...FEATURED_SELLERS,
  ...EXTRA_LIVE_SELLERS,
];

/** Backward-compat: featured rebalancing outsider used by partner probes. */
export const FEATURED_THIRD_PARTY: ThirdPartySeller = FEATURED_SELLERS[0]!;

export function isFeaturedThirdParty(
  chainId: number,
  tokenId: string | number,
): boolean {
  const t = String(tokenId);
  return FEATURED_SELLERS.some(
    (s) => Number(chainId) === s.chainId && String(s.tokenId) === t,
  );
}

export function isPinnedLiveSeller(
  chainId: number,
  tokenId: string | number,
): boolean {
  const t = String(tokenId);
  return LIVE_SELLERS.some(
    (s) => Number(chainId) === s.chainId && String(s.tokenId) === t,
  );
}

export function getFeaturedThirdParty(
  categoryId?: CategoryId | null,
): ThirdPartySeller | null {
  if (!categoryId) return FEATURED_THIRD_PARTY;
  return FEATURED_SELLERS.find((s) => s.categoryId === categoryId) ?? null;
}

export function getFeaturedSellers(
  categoryId?: CategoryId | null,
): ThirdPartySeller[] {
  if (!categoryId) return [...FEATURED_SELLERS];
  return FEATURED_SELLERS.filter((s) => s.categoryId === categoryId);
}

export function getLiveSellers(
  categoryId?: CategoryId | null,
): ThirdPartySeller[] {
  if (!categoryId) return [...LIVE_SELLERS];
  return LIVE_SELLERS.filter((s) => s.categoryId === categoryId);
}

export function getFeaturedByToken(
  chainId: number,
  tokenId: string | number,
): ThirdPartySeller | null {
  const t = String(tokenId);
  return (
    LIVE_SELLERS.find(
      (s) => Number(s.chainId) === Number(chainId) && String(s.tokenId) === t,
    ) ?? null
  );
}

/** Prefer the 8004scan row; fall back to the pin so a lagging index cannot 404 a live hire. */
export function resolveCatalogAgent(
  chainId: number,
  tokenId: string | number,
  scanned: Agent | null,
): Agent | null {
  const featured = getFeaturedByToken(chainId, tokenId);
  if (!featured) return scanned;
  if (!scanned) return featuredAsAgent(featured);
  return {
    ...scanned,
    name: scanned.name || featured.name,
    description: scanned.description || featured.description,
    a2a_endpoint:
      scanned.a2a_endpoint || featured.rpcUrl || featured.a2aCardUrl,
    owner_address: scanned.owner_address || featured.ownerAddress,
    supported_protocols: scanned.supported_protocols?.length
      ? scanned.supported_protocols
      : ["A2A", "ERC-8183"],
  };
}

export function featuredAsAgent(seller?: ThirdPartySeller | null): Agent {
  const s = seller || FEATURED_THIRD_PARTY;
  return {
    id: `featured:${s.slug}`,
    agent_id: `${s.chainId}:${s.tokenId}`,
    token_id: s.tokenId,
    chain_id: s.chainId,
    owner_address: s.ownerAddress,
    name: s.name,
    description: s.description,
    x402_supported: Boolean(s.a2aCardUrl && s.slug === "bnb-lp-rebalancer"),
    supported_protocols: ["A2A", "ERC-8183"],
    a2a_endpoint: s.a2aCardUrl || s.rpcUrl || undefined,
    a2a_card_url: s.a2aCardUrl || undefined,
    a2a_rpc: s.rpcUrl || s.a2aCardUrl || undefined,
    last_probe_kind: "pin",
    census_category: s.categoryId,
    desk_live: true,
    total_score: 25,
    health_score: 100,
  };
}

export function a2aRpcUrl(cardOrRpc: string): string {
  const raw = cardOrRpc.trim();
  if (/\/a2a\/?$/i.test(raw)) return raw.replace(/\/?$/, "/");
  return raw
    .replace(/\/\.well-known\/agent-card\.json\/?$/i, "/")
    .replace(/\/?$/, "/");
}

export function sellerRpcUrl(s: ThirdPartySeller): string {
  return a2aRpcUrl(s.rpcUrl || s.a2aCardUrl);
}

export function sellerFromAgent(agent: Agent): ThirdPartySeller | null {
  const featured = LIVE_SELLERS.find(
    (s) =>
      Number(s.chainId) === Number(agent.chain_id) &&
      String(s.tokenId) === String(agent.token_id),
  );
  if (featured) return featured;
  const card = agent.a2a_endpoint?.trim();
  if (!card) return null;
  const rest =
    agent.description?.match(/https?:\/\/[^\s]+-api\.[^\s]+/i)?.[0] ||
    undefined;
  return {
    slug: `idx-${agent.chain_id}-${agent.token_id}`,
    name: agent.name || `Agent #${agent.token_id}`,
    chainId: agent.chain_id,
    tokenId: String(agent.token_id),
    categoryId: "rebalancing",
    tagline: "Indexed seller with a live A2A endpoint",
    description: agent.description || "",
    a2aCardUrl: card,
    restBase: rest?.replace(/[).,]+$/, ""),
    ownerAddress: agent.owner_address || "",
  };
}

export function thirdPartyHref(s: ThirdPartySeller) {
  return `/agents/${s.chainId}/${s.tokenId}`;
}

export function thirdPartyBuyHref(s: ThirdPartySeller, opts?: { buy?: boolean }) {
  const q = opts?.buy ? "?buy=1" : "";
  return `/agents/${s.chainId}/${s.tokenId}${q}#buy`;
}
