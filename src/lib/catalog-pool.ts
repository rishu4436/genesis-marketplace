/**
 * Shared 8004scan hireable pool for /hire and /browse.
 * Aim for 200–500 loaded agents so x402 / verified / job chips
 * still have rows after in-memory filters.
 */

import type { Agent } from "./types";
import { listAgentsSafe, searchAgentsSafe, dedupeAgents } from "./scan";

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
}): Promise<{ agents: Agent[]; error: string | null; apiTotal: number | null }> {
  const collected: Agent[] = [];
  const apiSort = opts.sortMode === "newest" ? "created_at" : "total_score";
  const jobs: Promise<SafeList>[] = [];

  // Fewer pages by default so /hire does not wait out a dead index.
  const scorePages = opts.live ? 4 : 3;
  for (let page = 1; page <= scorePages; page++) {
    jobs.push(
      listAgentsSafe({
        chainId: 56,
        page,
        limit: 100,
        sortBy: apiSort as "total_score" | "created_at",
        sortOrder: "desc",
      }),
    );
  }

  if (opts.q) {
    jobs.push(searchAgentsSafe({ q: opts.q, limit: 80, chainId: 56 }));
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
  } else {
    for (const seed of JOB_SEEDS) {
      jobs.push(searchAgentsSafe({ q: seed, limit: 40, chainId: 56 }));
    }
  }

  // Always pull A2A rows so live third-party is not buried under identity-only.
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

  const results = await Promise.all(jobs);
  const { error, apiTotal } = collect(results, collected);

  return {
    agents: dedupeAgents(collected),
    error: collected.length ? null : error,
    apiTotal,
  };
}
