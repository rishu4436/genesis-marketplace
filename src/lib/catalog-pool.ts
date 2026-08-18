/**
 * Shared 8004scan hireable pool for /hire and /browse.
 * Multiple partner pages, then the caller re-sorts in memory.
 */

import type { Agent } from "./types";
import { listAgentsSafe, searchAgentsSafe, dedupeAgents } from "./scan";

export type CatalogSortMode = "rank" | "score" | "newest" | "ratings";

export async function fetchHireablePool(opts: {
  q?: string;
  sortMode: CatalogSortMode;
}): Promise<{ agents: Agent[]; error: string | null; apiTotal: number | null }> {
  const collected: Agent[] = [];
  let error: string | null = null;
  let apiTotal: number | null = null;

  if (opts.q) {
    const [semantic, listed, listed2] = await Promise.all([
      searchAgentsSafe({ q: opts.q, limit: 80, chainId: 56 }),
      listAgentsSafe({
        chainId: 56,
        search: opts.q,
        limit: 80,
        page: 1,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
      listAgentsSafe({
        chainId: 56,
        search: opts.q,
        limit: 80,
        page: 2,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
    ]);
    for (const r of [semantic, listed, listed2]) {
      if (r.data) collected.push(...r.data);
      if (r.error && !error) error = r.error;
    }
    apiTotal = listed.meta?.pagination?.total ?? null;
  } else {
    const apiSort = opts.sortMode === "newest" ? "created_at" : "total_score";
    const maxPages = 3;

    const pages = await Promise.all(
      Array.from({ length: maxPages }, (_, i) =>
        listAgentsSafe({
          chainId: 56,
          page: i + 1,
          limit: 40,
          sortBy: apiSort as "total_score" | "created_at",
          sortOrder: "desc",
        }),
      ),
    );

    for (const res of pages) {
      if (res.data?.length) collected.push(...res.data);
      if (res.error && !error) error = res.error;
      if (res.meta?.pagination?.total != null) {
        apiTotal = res.meta.pagination.total;
      }
    }
  }

  return {
    agents: dedupeAgents(collected),
    error: collected.length ? null : error,
    apiTotal,
  };
}
