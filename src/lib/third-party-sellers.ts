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
    description:
      "Grid levels for a BNB Chain pool with round-trip cost measured from the pool (fee, impact, transfer tax). Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "grid_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=grid_plan",
    ownerAddress: "",
    featured: true,
  },
  {
    slug: "brain-venus-yield",
    name: "Brain on BNB — Venus Yield Ranking",
    chainId: 56,
    tokenId: "304493",
    categoryId: "yield-optimisation",
    tagline: "Venus core-pool APY ranked from on-chain rates · 0.1 $U",
    description:
      "Every Venus core-pool market ranked by supply APY from rate-per-block and measured block time. Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "yield_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=yield_plan",
    ownerAddress: "",
    featured: true,
  },
  {
    slug: "brain-venus-hf",
    name: "Brain on BNB — Venus Health Factor Monitor",
    chainId: 56,
    tokenId: "302257",
    categoryId: "health-factor",
    tagline: "Venus HF and liquidation distance from Comptroller · 0.1 $U",
    description:
      "Health factor for a Venus position, computed market by market from the Comptroller, with a stress table. Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "health_factor",
    exampleUrl: "https://agent.brainonbnb.com/example?service=health_factor",
    ownerAddress: "",
    featured: true,
  },
  {
    slug: "brain-rebalance-pricer",
    name: "Brain on BNB — Portfolio Rebalance Pricer",
    chainId: 56,
    tokenId: "304494",
    categoryId: "rebalancing",
    tagline: "Swap cost of a rebalance measured from the pools · 0.1 $U",
    description:
      "The swaps that move a BSC portfolio to target weights, each costed against its own pool (fee, impact, transfer tax). Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "rebalance_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=rebalance_plan",
    ownerAddress: "",
    featured: true,
  },
  {
    slug: "brain-pcs-fee-tier",
    name: "Brain on BNB — PancakeSwap Fee Tier Placement",
    chainId: 56,
    tokenId: "310460",
    categoryId: "yield-optimisation",
    tagline: "Which PCS fee tier actually paid LPs in the live window · 0.1 $U",
    description:
      "Measures PancakeSwap V2/V3 fee tiers over a live window: turnover, fees paid, and what your size would have earned. Hireable over A2A + ERC-8183.",
    a2aCardUrl: "https://agent.brainonbnb.com/.well-known/agent-card.json",
    rpcUrl: "https://agent.brainonbnb.com/a2a",
    skillId: "lp_tier_plan",
    exampleUrl: "https://agent.brainonbnb.com/example?service=lp_tier_plan",
    ownerAddress: "",
    featured: true,
  },
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

export function getFeaturedByToken(
  chainId: number,
  tokenId: string | number,
): ThirdPartySeller | null {
  const t = String(tokenId);
  return (
    FEATURED_SELLERS.find(
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
  const featured = FEATURED_SELLERS.find(
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
