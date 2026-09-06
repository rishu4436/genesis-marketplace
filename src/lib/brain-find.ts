/**
 * Brain Plaza measured find — agents that answered, with real endpoints.
 * Used to surface hireable A2A and to list the rest as Unhireable.
 */

import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { isPublicHireableUrl } from "./hire-class";
import { kvCmd } from "./kv";

const BRAIN_FIND = "https://agent.brainonbnb.com/find";
const CACHE_KEY = "genesis:catalog:brain-find:v1";
const FETCH_MS = 4_500;

const BRAIN_CATS: { brain: string; ours: CategoryId }[] = [
  { brain: "rebalancing", ours: "rebalancing" },
  { brain: "grid-trading", ours: "grid-trading" },
  { brain: "yield-optimization", ours: "yield-optimisation" },
  { brain: "health-factor", ours: "health-factor" },
];

type BrainHit = {
  id?: number | string;
  name?: string | null;
  description?: string | null;
  speaks?: string[];
  endpoints?: string[];
  agent_card?: string;
  skills?: unknown;
};

type BrainFindResponse = {
  results?: BrainHit[];
};

function abortMs(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function speaksA2a(hit: BrainHit): boolean {
  return (hit.speaks || []).some((s) => String(s).toLowerCase() === "a2a");
}

function pickCard(hit: BrainHit): string | undefined {
  if (hit.agent_card && /^https:\/\//i.test(hit.agent_card)) return hit.agent_card;
  return (hit.endpoints || []).find((e) =>
    /agent-card\.json/i.test(e),
  );
}

function pickRpc(hit: BrainHit): string | undefined {
  return (hit.endpoints || []).find((e) => /\/a2a\/?$/i.test(e));
}

function hireableEndpoint(hit: BrainHit): string | undefined {
  if (!speaksA2a(hit)) return undefined;
  const rpc = pickRpc(hit);
  if (rpc && isPublicHireableUrl(rpc)) return rpc;
  const card = pickCard(hit);
  if (card && isPublicHireableUrl(card)) return card;
  const first = (hit.endpoints || []).find((e) => isPublicHireableUrl(e));
  return first;
}

export function brainHitToAgent(
  hit: BrainHit,
  categoryId: CategoryId,
): Agent | null {
  const token = hit.id != null ? String(hit.id) : "";
  if (!/^\d+$/.test(token)) return null;
  const a2a = hireableEndpoint(hit);
  const name = (hit.name || "").trim() || `Agent #${token}`;
  return {
    id: `brain:${categoryId}:${token}`,
    agent_id: `56:${token}`,
    token_id: token,
    chain_id: 56,
    name,
    description:
      (hit.description || "").trim() ||
      `Indexed ERC-8004 identity on BSC · ${categoryId}.`,
    a2a_endpoint: a2a || undefined,
    supported_protocols: speaksA2a(hit)
      ? ["A2A", "ERC-8183"]
      : hit.speaks?.length
        ? hit.speaks.map((s) => String(s).toUpperCase())
        : undefined,
    x402_supported: (hit.speaks || []).some(
      (s) => String(s).toLowerCase() === "x402",
    ),
  };
}

async function fetchOne(
  brainCat: string,
  ours: CategoryId,
): Promise<Agent[]> {
  try {
    const res = await fetch(
      `${BRAIN_FIND}?category=${encodeURIComponent(brainCat)}`,
      {
        signal: abortMs(FETCH_MS),
        headers: { Accept: "application/json" },
        next: { revalidate: 180 },
      },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as BrainFindResponse;
    const out: Agent[] = [];
    for (const hit of body.results || []) {
      const agent = brainHitToAgent(hit, ours);
      if (agent) out.push(agent);
    }
    return out;
  } catch {
    return [];
  }
}

/** Prefer a live A2A URL when the same token appears twice. */
export function overlayA2a(base: Agent[], extras: Agent[]): Agent[] {
  const extraBy = new Map<string, Agent>();
  for (const a of extras) {
    extraBy.set(`${a.chain_id}:${a.token_id}`, a);
  }
  const seen = new Set<string>();
  const out: Agent[] = [];
  for (const a of base) {
    const k = `${a.chain_id}:${a.token_id}`;
    seen.add(k);
    const x = extraBy.get(k);
    if (x?.a2a_endpoint && !isPublicHireableUrl(a.a2a_endpoint || "")) {
      out.push({
        ...a,
        a2a_endpoint: x.a2a_endpoint,
        name: a.name || x.name,
        description: a.description || x.description,
        supported_protocols: a.supported_protocols?.length
          ? a.supported_protocols
          : x.supported_protocols,
      });
    } else {
      out.push(a);
    }
  }
  for (const x of extras) {
    const k = `${x.chain_id}:${x.token_id}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

export async function fetchBrainFindCatalog(): Promise<Agent[]> {
  const cached = await kvCmd<string>("GET", CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { agents?: Agent[] };
      if (parsed.agents?.length) return parsed.agents;
    } catch {
      /* ignore */
    }
  }

  const batches = await Promise.all(
    BRAIN_CATS.map((c) => fetchOne(c.brain, c.ours)),
  );
  const agents = batches.flat();
  if (agents.length) {
    await kvCmd(
      "SET",
      CACHE_KEY,
      JSON.stringify({ agents, savedAt: Date.now() }),
      "EX",
      900,
    );
  }
  return agents;
}

export async function fetchBrainFindForCategory(
  categoryId: CategoryId,
): Promise<Agent[]> {
  const row = BRAIN_CATS.find((c) => c.ours === categoryId);
  if (!row) return [];
  return fetchOne(row.brain, row.ours);
}
