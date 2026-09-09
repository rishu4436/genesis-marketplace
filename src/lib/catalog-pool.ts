/**
 * Shared 8004scan hireable pool for /browse.
 * Aim for 200–500 loaded agents so x402 / verified / job chips
 * still have rows after in-memory filters.
 */

import type { Agent } from "./types";
import { listAgentsSafe, searchAgentsSafe, dedupeAgents } from "./scan";
import { kvCmd } from "./kv";
import { fetchBrainFindCatalog, overlayA2a } from "./brain-find";
import { featuredAsAgent, LIVE_SELLERS } from "./third-party-sellers";
import { agentMatchesQuery } from "./agent-rank";
import {
  fetchCensusAlive,
  type CensusAliveStats,
} from "./census-alive";
import { filterHireableCatalog } from "./catalog-quality";
import { hireableBscAsAgents } from "./hireable-bsc";
import { createSwrMem } from "./swr-mem";

const CATALOG_CACHE_KEY = "genesis:catalog:hireable:v5";
const catalogSwr = createSwrMem<{
  agents: Agent[];
  error: string | null;
  apiTotal: number | null;
  census: CensusAliveStats | null;
}>(60_000, 900_000);

export type CatalogSortMode = "rank" | "score" | "newest" | "ratings";

type SafeList = Awaited<ReturnType<typeof listAgentsSafe>>;

const JOB_SEEDS = [
  "grid trading",
  "yield",
  "rebalancing",
  "x402",
];

function collect(
  results: SafeList[],
  into: Agent[],
): { error: string | null; apiTotal: number | null } {
  let error: string | null = null;
  let apiTotal: number | null = null;
  for (const res of results) {
    if (res.data?.length) into.push(...res.data);
    if (res.error && !error) error = res.error;
    if (res.meta?.pagination?.total != null) {
      apiTotal = res.meta.pagination.total;
    }
  }
  return { error, apiTotal };
}

export async function fetchHireablePool(opts: {
  q?: string;
  sortMode: CatalogSortMode;
  x402?: boolean;
  verified?: boolean;
  live?: boolean;
}): Promise<{
  agents: Agent[];
  error: string | null;
  apiTotal: number | null;
  census: CensusAliveStats | null;
}> {
  const searching = Boolean(opts.q?.trim());
  const filtered = Boolean(opts.x402 || opts.verified || opts.live || searching);
  if (!filtered) {
    return catalogSwr.get(() => buildHireablePool(opts));
  }
  return buildHireablePool(opts);
}

async function buildHireablePool(opts: {
  q?: string;
  sortMode: CatalogSortMode;
  x402?: boolean;
  verified?: boolean;
  live?: boolean;
}): Promise<{
  agents: Agent[];
  error: string | null;
  apiTotal: number | null;
  census: CensusAliveStats | null;
}> {
  const collected: Agent[] = [];
  const apiSort = opts.sortMode === "newest" ? "created_at" : "total_score";
  const jobs: Promise<SafeList>[] = [];
  const searching = Boolean(opts.q?.trim());

  if (!searching) {
    const cached = await kvCmd<string>("GET", CATALOG_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          agents?: Agent[];
          apiTotal?: number | null;
          savedAt?: number;
          census?: CensusAliveStats | null;
        };
        if (parsed.agents?.length) {
          return {
            agents: parsed.agents,
            error: null,
            apiTotal: parsed.apiTotal ?? null,
            census: parsed.census ?? null,
          };
        }
      } catch {
        /* rebuild */
      }
    }
  }

  // Unfiltered top pages only when there is no search — a query must
  // not be padded with the same 300-agent dump as the empty catalog.
  if (!searching) {
    const scorePages = opts.live ? 4 : 3;
    for (let page = 1; page <= scorePages; page++) {
      jobs.push(
        listAgentsSafe({
          chainId: 56,
          page,
          limit: 100,
          protocol: "A2A",
          sortBy: apiSort as "total_score" | "created_at",
          sortOrder: "desc",
        }),
      );
    }
    for (const seed of JOB_SEEDS) {
      jobs.push(searchAgentsSafe({ q: seed, limit: 40, chainId: 56 }));
    }
  } else {
    jobs.push(searchAgentsSafe({ q: opts.q!, limit: 80, chainId: 56 }));
    jobs.push(
      listAgentsSafe({
        chainId: 56,
        search: opts.q,
        limit: 100,
        page: 1,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
    );
    jobs.push(
      listAgentsSafe({
        chainId: 56,
        search: opts.q,
        limit: 100,
        page: 2,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
    );
  }

  if (!searching) {
    const a2aPages = opts.live ? 2 : 1;
    for (let page = 1; page <= a2aPages; page++) {
      jobs.push(
        listAgentsSafe({
          chainId: 56,
          protocol: "A2A",
          limit: 100,
          page,
          sortBy: "total_score",
          sortOrder: "desc",
        }),
      );
    }
  }

  if (opts.live) {
    jobs.push(searchAgentsSafe({ q: opts.q ? `${opts.q} A2A` : "A2A", limit: 80, chainId: 56 }));
  }

  if (opts.x402) {
    const q = opts.q ? `${opts.q} x402` : "x402";
    jobs.push(searchAgentsSafe({ q, limit: 80, chainId: 56 }));
    jobs.push(
      listAgentsSafe({
        chainId: 56,
        protocol: "A2A",
        limit: 100,
        page: 3,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
    );
  }

  if (opts.verified) {
    const q = opts.q ? `${opts.q} verified` : "verified";
    jobs.push(searchAgentsSafe({ q, limit: 80, chainId: 56 }));
  }

  const [results, brain, census] = await Promise.all([
    Promise.all(jobs),
    fetchBrainFindCatalog(),
    fetchCensusAlive(),
  ]);
  const { error, apiTotal } = collect(results, collected);
  const pinned = LIVE_SELLERS.map((s) => featuredAsAgent(s));
  let agents = filterHireableCatalog(
    overlayA2a(
      dedupeAgents([
        ...pinned,
        ...hireableBscAsAgents(),
        ...census.agents,
        ...collected,
      ]),
      brain,
    ),
  );
  if (searching) {
    agents = agents.filter((a) => agentMatchesQuery(a, opts.q!));
  }

  if (!searching && agents.length) {
    await kvCmd(
      "SET",
      CATALOG_CACHE_KEY,
      JSON.stringify({
        agents,
        apiTotal,
        savedAt: Date.now(),
        census: census.stats,
      }),
      "EX",
      900,
    );
    return { agents, error: null, apiTotal, census: census.stats };
  }

  if (searching) {
    return {
      agents,
      error: agents.length ? null : error,
      apiTotal,
      census: census.stats,
    };
  }

  const cached = await kvCmd<string>("GET", CATALOG_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as {
        agents?: Agent[];
        apiTotal?: number | null;
      };
      if (parsed.agents?.length) {
        return {
          agents: parsed.agents,
          error: error
            ? `${error} · showing last good catalog`
            : null,
          apiTotal: parsed.apiTotal ?? apiTotal,
          census: census.stats,
        };
      }
    } catch {
      /* ignore */
    }
  }

  return {
    agents,
    error: collected.length ? null : error,
    apiTotal,
    census: census.stats,
  };
}
