import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, type BrowseFilters } from "@/components/FilterBar";
import {
  listAgentsSafe,
  searchAgentsSafe,
  dedupeAgents,
} from "@/lib/scan";
import { filterAgents, sortAgents } from "@/lib/agent-rank";
import type { Agent } from "@/lib/types";
import Link from "next/link";

export const revalidate = 90;

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    x402?: string;
    verified?: string;
    feedback?: string;
  }>;
};

export default async function BrowsePage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1") || 1);
  const limit = 24;
  const filters: BrowseFilters = {
    q: q || undefined,
    page: String(page),
    sort: sp.sort,
    x402: sp.x402,
    verified: sp.verified,
    feedback: sp.feedback,
  };

  let agents: Agent[] = [];
  let total: number | null = null;
  let hasMore = false;
  let error: string | null = null;

  if (q) {
    const [semantic, listed] = await Promise.all([
      searchAgentsSafe({ q, limit: 40, chainId: 56 }),
      listAgentsSafe({
        chainId: 56,
        search: q,
        limit: 40,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
    ]);
    agents = dedupeAgents([...(semantic.data || []), ...(listed.data || [])]);
    error = agents.length ? null : semantic.error || listed.error;
    total = agents.length;
  } else {
    const res = await listAgentsSafe({
      chainId: 56,
      page,
      limit: 48,
      sortBy: "total_score",
      sortOrder: "desc",
    });
    agents = res.data || [];
    total = res.meta?.pagination?.total ?? null;
    hasMore = Boolean(res.meta?.pagination?.hasMore);
    error = res.error;
  }

  const sortMode =
    filters.sort === "score" ||
    filters.sort === "newest" ||
    filters.sort === "feedback"
      ? filters.sort
      : "rank";

  agents = filterAgents(agents, {
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
    hasFeedback: filters.feedback === "1",
  });
  agents = sortAgents(agents, { mode: sortMode }).slice(0, limit);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Marketplace
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Live ERC-8004 agents on BNB Smart Chain. Search, filter, compare, hire.
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-3 sm:flex-row" action="/browse">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search skills or jobs… yield, grid, liquidation, PancakeSwap"
          className="w-full flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none ring-amber-400/40 focus:ring-2"
        />
        {filters.sort && (
          <input type="hidden" name="sort" value={filters.sort} />
        )}
        <button
          type="submit"
          className="rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          "rebalancing",
          "grid trading",
          "yield",
          "health factor",
          "PancakeSwap",
          "liquidation",
        ].map((chip) => (
          <Link
            key={chip}
            href={`/browse?q=${encodeURIComponent(chip)}`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60 transition hover:border-amber-400/40 hover:text-amber-200"
          >
            {chip}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <FilterBar filters={filters} />
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-white/45">
        <span>
          {error && agents.length === 0
            ? "—"
            : q
              ? `${agents.length} result${agents.length === 1 ? "" : "s"} for “${q}”`
              : total != null
                ? `Showing ${agents.length} · ~${total.toLocaleString()} on BSC`
                : `${agents.length} agents`}
        </span>
        <div className="flex gap-3">
          <Link href="/compare" className="text-amber-300 hover:text-amber-200">
            Compare tray
          </Link>
          <Link
            href="/categories"
            className="text-amber-300 hover:text-amber-200"
          >
            Categories →
          </Link>
        </div>
      </div>

      {error && agents.length === 0 && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
          <span className="mt-1 block text-xs text-rose-200/70">
            Tip: set SCAN_API_KEY in .env.local for higher rate limits.
          </span>
        </div>
      )}

      {agents.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id || a.agent_id} agent={a} />
          ))}
        </div>
      ) : (
        !error && (
          <div className="mt-10">
            <EmptyState
              title="No agents match"
              body="Try clearing filters or a broader search. Categories always show curated shelves."
              actionHref="/categories"
              actionLabel="Browse categories"
            />
          </div>
        )
      )}

      {!q && (page > 1 || hasMore) && (
        <div className="mt-10 flex justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/browse?page=${page - 1}`}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              ← Previous
            </Link>
          )}
          {hasMore && (
            <Link
              href={`/browse?page=${page + 1}`}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
