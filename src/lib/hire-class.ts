/**
 * Honest listing classes — marketplace vs directory.
 * genesis = we operate · live = third-party endpoint · indexed = identity only
 */

import type { Agent } from "./types";
import { CATEGORIES } from "./categories";
import { isFeaturedThirdParty } from "./third-party-sellers";
import { allGenesisAgents } from "./genesis-agents";

export type HireClass = "genesis" | "live" | "indexed";

export function matchingGenesisSlug(agent: Agent): string | null {
  const flagged = (agent as Agent & { genesis_slug?: string; genesis_verified?: boolean });
  if (flagged.genesis_slug) return flagged.genesis_slug;
  if (agent.id?.startsWith("genesis:")) return agent.id.slice("genesis:".length);
  const hit = allGenesisAgents().find(
    (g) =>
      Boolean(g.tokenId) &&
      String(g.tokenId) === String(agent.token_id) &&
      Number(g.chainId ?? 56) === Number(agent.chain_id),
  );
  return hit?.slug ?? null;
}

export function isGenesisListing(agent: Agent): boolean {
  return matchingGenesisSlug(agent) != null;
}

export function listingHref(agent: Agent): string {
  const slug = matchingGenesisSlug(agent);
  if (slug) return `/genesis/${slug}`;
  return `/agents/${agent.chain_id}/${agent.token_id}`;
}

export function hireClassForAgent(agent: Agent): HireClass {
  if (isGenesisListing(agent)) return "genesis";
  if (isFeaturedThirdParty(agent.chain_id, agent.token_id)) return "live";
  if (agent.a2a_endpoint) return "live";
  return "indexed";
}

export function hireClassLabel(c: HireClass): string {
  if (c === "genesis") return "By Genesis";
  if (c === "live") return "Live third-party";
  return "Indexed identity";
}

export function hireClassHint(c: HireClass): string {
  if (c === "genesis") return "Hire-ready specialist · structured plan";
  if (c === "live") return "We negotiate their endpoint · their report";
  return "On-chain identity · no live hire we can complete";
}

const DEFI_NEEDLES = [
  ...CATEGORIES.flatMap((c) => c.keywords),
  "pancake",
  "pcs",
  "venus",
  "aave",
  "amm",
  "lp",
  "liquidity",
  "grid",
  "yield",
  "apr",
  "health factor",
  "liquidation",
  "rebalance",
];

export function isDefiJobAgent(agent: Agent): boolean {
  const hay = `${agent.name || ""} ${agent.description || ""}`.toLowerCase();
  return DEFI_NEEDLES.some((n) => hay.includes(n.toLowerCase()));
}

/** Higher = belongs on the destination floor */
export function destinationRank(agent: Agent): number {
  let s = 0;
  const genesis =
    agent.id?.startsWith("genesis:") ||
    Boolean((agent as Agent & { genesis_verified?: boolean }).genesis_verified);
  if (genesis) s += 2000;
  const cls = hireClassForAgent(agent);
  if (cls === "live") s += 400;
  if (isDefiJobAgent(agent)) s += 120;
  if (agent.x402_supported) s += 25;
  if (agent.is_verified) s += 20;
  s += Math.min(agent.total_feedbacks ?? 0, 40) * 2;
  s += (agent.total_score ?? 0) * 1.5;
  s += (agent.health_score ?? 0) * 0.4;
  if ((agent.description || "").length > 80) s += 10;
  return s;
}

export function sortForDestination(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => destinationRank(b) - destinationRank(a));
}

export function catalogLiveStats(agents: Agent[]): {
  live: number;
  indexed: number;
  rated: number;
  total: number;
} {
  let live = 0;
  let rated = 0;
  for (const a of agents) {
    if (hireClassForAgent(a) === "live") live += 1;
    if ((a.total_feedbacks ?? 0) > 0 && (a.average_score ?? 0) > 0) rated += 1;
  }
  return {
    live,
    indexed: agents.length - live,
    rated,
    total: agents.length,
  };
}
