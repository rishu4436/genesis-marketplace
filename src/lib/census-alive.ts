/**
 * Endpoint-alive census for BSC ERC-8004.
 * Census (AgentCensus public JSON) probes declared URLs hourly.
 * Alive ≠ hireable: we only mark A2A we can call as live.
 */

import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { isCloneBotName, isPublicHireableUrl } from "./hire-class";
import { categorizeHireable } from "./hireable-bsc";
import { kvCmd } from "./kv";
import { createSwrMem } from "./swr-mem";

const CENSUS_URL = "https://agentcensus.xyz/api/agents";
const CACHE_KEY = "genesis:census:alive:v1";
const FETCH_MS = 8_000;
const ALIVE_PAGES = 13;

export type CensusAliveStats = {
  registered: number;
  alive: number;
  fetched: number;
  source: "agentcensus.xyz";
  asOf: string;
  error: string | null;
};

type CensusRow = {
  agent_id?: number | string;
  owner?: string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  x402_support?: number | boolean | null;
  service_endpoints?: string | string[] | null;
  probe_status?: string | null;
  probe_latency_ms?: number | null;
};

type CensusPage = {
  network?: string;
  total?: number;
  agents?: CensusRow[];
};

function abortMs(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function parseEndpoints(raw: CensusRow["service_endpoints"]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const p = JSON.parse(raw) as unknown;
    if (Array.isArray(p)) return p.map(String);
  } catch {
    /* not JSON */
  }
  return [];
}

function pickA2a(urls: string[]): string | undefined {
  const https = urls.filter((u) => isPublicHireableUrl(u));
  return https.find((u) => /\/a2a(\/|$|\?)|agent-card\.json/i.test(u));
}

export function censusCategoryToOurs(
  raw?: string | null,
): CategoryId | null {
  const c = (raw || "").toLowerCase();
  if (c === "grid-trading" || c === "grid") return "grid-trading";
  if (c === "health-factor" || c === "health") return "health-factor";
  if (c === "yield" || c === "yield-optimisation") return "yield-optimisation";
  if (c === "rebalancing" || c === "rebalance") return "rebalancing";
  return null;
}

function rowToAgent(row: CensusRow): Agent | null {
  const token = String(row.agent_id ?? "");
  if (!/^\d+$/.test(token)) return null;
  const endpoints = parseEndpoints(row.service_endpoints);
  const a2a = pickA2a(endpoints);
  const name = (row.name || "").trim() || `Agent #${token}`;
  const cat = censusCategoryToOurs(row.category);
  const desc =
    (row.description || "").trim() ||
    "ERC-8004 identity whose declared endpoint answered a public probe.";
  return {
    id: `census:56:${token}`,
    agent_id: `56:${token}`,
    token_id: token,
    chain_id: 56,
    owner_address: row.owner || undefined,
    name,
    description: cat ? `${desc}` : desc,
    a2a_endpoint: a2a || undefined,
    x402_supported: Boolean(row.x402_support),
    supported_protocols: a2a ? ["A2A"] : undefined,
    probe_status: "alive",
    probe_latency_ms:
      typeof row.probe_latency_ms === "number" ? row.probe_latency_ms : undefined,
    census_category: row.category || undefined,
  };
}

async function fetchPage(page: number): Promise<CensusPage | null> {
  try {
    const res = await fetch(`${CENSUS_URL}?net=mainnet&page=${page}`, {
      headers: { Accept: "application/json" },
      signal: abortMs(FETCH_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CensusPage;
  } catch {
    return null;
  }
}

async function mapPool<T, R>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const ret = new Array<R>(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, () => worker()),
  );
  return ret;
}

type CensusBundle = {
  agents: Agent[];
  stats: CensusAliveStats;
};

const censusSwr = createSwrMem<CensusBundle>(60_000, 900_000);

export function peekCensusAlive(): CensusBundle | null {
  return censusSwr.peek();
}

export async function fetchCensusAlive(): Promise<CensusBundle> {
  return censusSwr.get(loadCensusAlive);
}

async function loadCensusAlive(): Promise<{
  agents: Agent[];
  stats: CensusAliveStats;
}> {
  const cached = await kvCmd<string>("GET", CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as {
        agents: Agent[];
        stats: CensusAliveStats;
      };
      if (parsed.agents?.length && parsed.stats) {
        censusSwr.set(parsed);
        return parsed;
      }
    } catch {
      /* rebuild */
    }
  }

  const pages = await mapPool(
    Array.from({ length: ALIVE_PAGES }, (_, i) => i + 1),
    4,
    fetchPage,
  );
  const agents: Agent[] = [];
  let registered = 0;
  let error: string | null = null;
  for (const page of pages) {
    if (!page) {
      if (!error) error = "Census probe timed out — using what arrived";
      continue;
    }
    if (typeof page.total === "number") registered = page.total;
    for (const row of page.agents || []) {
      if (row.probe_status !== "alive") continue;
      const agent = rowToAgent(row);
      if (agent) agents.push(agent);
    }
  }

  const stats: CensusAliveStats = {
    registered,
    alive: agents.length,
    fetched: agents.length,
    source: "agentcensus.xyz",
    asOf: new Date().toISOString(),
    error: agents.length ? null : error || "Census returned no alive agents",
  };

  const bundle = { agents, stats };
  censusSwr.set(bundle);
  if (agents.length) {
    await kvCmd(
      "SET",
      CACHE_KEY,
      JSON.stringify(bundle),
      "EX",
      900,
    );
  }
  return bundle;
}

export function censusAgentsForCategory(
  agents: Agent[],
  categoryId: CategoryId,
): Agent[] {
  return agents.filter((a) => {
    if (isCloneBotName(a.name, a.description || "")) return false;
    return (
      categorizeHireable(a.name, a.description || "", a.census_category) ===
      categoryId
    );
  });
}
