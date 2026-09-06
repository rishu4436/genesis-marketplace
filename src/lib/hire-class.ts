/**
 * Honest listing classes — marketplace vs directory.
 * genesis = we operate · live = third-party endpoint · indexed = identity only
 */

import type { Agent } from "./types";
import { CATEGORIES } from "./categories";
import { isPinnedLiveSeller } from "./third-party-sellers";
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

/** Directory leaks — names that must never look hireable. */
const JUNK_NAME =
  /^(test\.agent|test agent|test[._-]agent|demo\.agent|foo\.agent)$/i;

const GENERIC_SLEEP_BOT =
  /while you sleep|personalized yield strategies|automated crypto trading bot with dca/i;
const GENERIC_BOT_NAME =
  /^(defibot|tradepilot|defimatrix)(\.agent)?$/i;

export function isDirectoryLeak(agent: Agent): boolean {
  const name = (agent.name || "").trim();
  const desc = (agent.description || "").trim();
  if (!name) return true;
  if (JUNK_NAME.test(name)) return true;
  if (/^test\./i.test(name)) return true;
  if (/test\.agent/i.test(name)) return true;
  if (GENERIC_BOT_NAME.test(name)) return true;
  if (GENERIC_SLEEP_BOT.test(name) || GENERIC_SLEEP_BOT.test(desc)) return true;
  return false;
}

/** Endpoints we cannot complete a hire against (IAM, object storage, stubs). */
const UNHIREABLE_A2A =
  /localhost|127\.0\.0\.1|\.example\.|bedrock-agentcore|execute-api\.|github\.com|s3[\w.-]*\.amazonaws\.com/i;

export function isPublicHireableUrl(url: string): boolean {
  const u = url.trim();
  if (!/^https:\/\//i.test(u)) return false;
  if (UNHIREABLE_A2A.test(u)) return false;
  return u.length >= 24;
}

function hasPublicA2a(agent: Agent): boolean {
  return isPublicHireableUrl(agent.a2a_endpoint || "");
}

export function hireClassForAgent(agent: Agent): HireClass {
  if (isGenesisListing(agent)) return "genesis";
  if (isDirectoryLeak(agent)) return "indexed";
  if (isPinnedLiveSeller(agent.chain_id, agent.token_id)) return "live";
  if (hasPublicA2a(agent)) return "live";
  return "indexed";
}

export function hireClassLabel(c: HireClass): string {
  if (c === "genesis") return "By Genesis";
  if (c === "live") return "Live third-party";
  return "Unhireable";
}

export function hireClassHint(c: HireClass): string {
  if (c === "genesis") return "Hire-ready specialist · structured plan";
  if (c === "live") return "We negotiate their endpoint · their report";
  return "On-chain identity · no live hire we can complete";
}

export function hireRailLabel(c: HireClass): string {
  if (c === "genesis") return "Genesis APEX · plan hire";
  if (c === "live") return "Live A2A";
  return "None";
}

/** Completes a hire: By Genesis specialist or a live third-party endpoint. */
export function isHireableListing(agent: Agent): boolean {
  return hireClassForAgent(agent) !== "indexed";
}

export function splitHireable<T extends Agent>(agents: T[]): {
  hireable: T[];
  identity: T[];
} {
  const hireable: T[] = [];
  const identity: T[] = [];
  for (const a of agents) {
    if (isHireableListing(a)) hireable.push(a);
    else identity.push(a);
  }
  return { hireable, identity };
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

export function sortHireableFirst<T extends Agent>(agents: T[]): T[] {
  const { hireable, identity } = splitHireable(agents);
  return [
    ...(sortForDestination(hireable) as T[]),
    ...(sortForDestination(identity) as T[]),
  ];
}

export function catalogLiveStats(agents: Agent[]): {
  live: number;
  indexed: number;
  hireable: number;
  identity: number;
  rated: number;
  total: number;
} {
  let live = 0;
  let genesis = 0;
  let rated = 0;
  for (const a of agents) {
    const cls = hireClassForAgent(a);
    if (cls === "live") live += 1;
    if (cls === "genesis") genesis += 1;
    if ((a.total_feedbacks ?? 0) > 0 && (a.average_score ?? 0) > 0) rated += 1;
  }
  const hireable = live + genesis;
  return {
    live,
    indexed: agents.length - live,
    hireable,
    identity: agents.length - hireable,
    rated,
    total: agents.length,
  };
}
