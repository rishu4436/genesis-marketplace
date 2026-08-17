import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, type BrowseFilters } from "@/components/FilterBar";
import { JobFloor } from "@/components/JobFloor";
import {
  listAgentsSafe,
  searchAgentsSafe,
  dedupeAgents,
} from "@/lib/scan";
import { filterAgents, sortAgents } from "@/lib/agent-rank";
import { agentScore, compareByScore } from "@/lib/agent-score";
import { catalogFilterStats } from "@/lib/catalog-quality";
import { sortForDestination } from "@/lib/hire-class";
import type { Agent } from "@/lib/types";
import Link from "next/link";

/** Browse uses searchParams; light revalidate via partner fetch cache */
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    x402?: string;
    verified?: string;
    ratings?: string;
    /** @deprecated use ratings=1 */
    feedback?: string;
  }>;
};

function buildBrowseHref(
  filters: BrowseFilters,
  patch: Partial<BrowseFilters> = {},
) {
  const next = { ...filters, ...patch };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  // Always keep sort in the URL when set (including when paging)
  if (next.sort) p.set("sort", next.sort);
  if (next.x402 === "1") p.set("x402", "1");
  if (next.verified === "1") p.set("verified", "1");
  if (next.ratings === "1") p.set("ratings", "1");
  if (next.page && next.page !== "1") p.set("page", next.page);
  const s = p.toString();
  return s ? `/browse?${s}` : "/browse";
}

async function fetchBrowsePool(opts: {
  q?: string;
  sortMode: "rank" | "score" | "newest" | "ratings";
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
    // Always pull multiple pages; we re-sort in memory so order is correct
    const apiSort =
      opts.sortMode === "newest" ? "created_at" : "total_score";
    // Keep this small — too many parallel partner calls freezes the page
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

export default async function BrowsePage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1") || 1);
  const pageSize = 24;

  const sortMode =
    sp.sort === "score" ||
    sp.sort === "newest" ||
    sp.sort === "ratings" ||
    sp.sort === "feedback"
      ? sp.sort === "feedback"
        ? "ratings"
        : sp.sort
      : "rank";

  const hasRatings = sp.ratings === "1" || sp.feedback === "1";

  // Keep sort in filters even for "rank" as empty — for score always "score"
  const filters: BrowseFilters = {
    q: q || undefined,
    page: String(page),
    sort: sortMode === "rank" ? undefined : sortMode,
    x402: sp.x402,
    verified: sp.verified,
    ratings: hasRatings ? "1" : undefined,
  };

  const pool = await fetchBrowsePool({ q: q || undefined, sortMode });
  const quality = catalogFilterStats(pool.agents);

  let agents = filterAgents(quality.kept, {
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
    hasRatings: filters.ratings === "1",
  });

  // CRITICAL: sort the FULL list, then slice — never sort one API page alone
  if (sortMode === "score") {
    agents = [...agents].sort(compareByScore);
  } else if (sortMode === "rank" && !q) {
    agents = sortForDestination(agents);
  } else {
    agents = sortAgents(agents, { mode: sortMode });
  }

  // Sanity: enforce score order if mode is score (guards against bugs)
  if (sortMode === "score" && agents.length > 1) {
    for (let i = 1; i < agents.length; i++) {
      if (agentScore(agents[i]) > agentScore(agents[i - 1])) {
        agents = [...agents].sort(compareByScore);
        break;
      }
    }
  }

  const totalFiltered = agents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageAgents = agents.slice(start, start + pageSize);
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const pageMin =
    pageAgents.length > 0
      ? Math.min(...pageAgents.map(agentScore))
      : 0;
  const pageMax =
    pageAgents.length > 0
      ? Math.max(...pageAgents.map(agentScore))
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="max-w-2xl">
        <p className="section-label">Marketplace</p>
        <h1 className="display-section mt-3 text-white">Marketplace</h1>
        <p className="lead mt-3">
          Start on the job floor. Search the hireable index when you need a
          name. Collectible and stutter listings stay hidden.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/browse" className="btn-primary !py-2 !text-sm">
          All agents
        </Link>
        <Link href="/categories" className="btn-secondary !py-2 !text-sm">
          By job category
        </Link>
        <Link href="/hire" className="btn-secondary !py-2 !text-sm">
          Hire specialists
        </Link>
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
        {filters.x402 === "1" && <input type="hidden" name="x402" value="1" />}
        {filters.verified === "1" && (
          <input type="hidden" name="verified" value="1" />
        )}
        {filters.ratings === "1" && (
          <input type="hidden" name="ratings" value="1" />
        )}
        <button type="submit" className="btn-primary !rounded-xl !py-3">
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
            href={buildBrowseHref(
              { ...filters, q: chip, page: "1" },
              {},
            )}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60 transition hover:border-amber-400/40 hover:text-amber-200"
          >
            {chip}
          </Link>
        ))}
      </div>

      {!q && (
        <div className="mt-10">
          <JobFloor perShelf={3} />
        </div>
      )}

      <div className="mt-6">
        <FilterBar filters={filters} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>
          {pool.error && pageAgents.length === 0
            ? "—"
            : `${q ? "Search" : "Hireable index"} · ${totalFiltered} loaded · page ${safePage}/${totalPages}`}
          {sortMode === "score" && pageAgents.length > 0 && (
            <span className="ml-1 text-amber-200/70">
              · sorted by score high→low · this page {pageMax.toFixed(0)}–
              {pageMin.toFixed(0)}
            </span>
          )}
          {quality.hidden > 0 && (
            <span className="text-white/30">
              {" "}
              · {quality.hidden} low-signal hidden
            </span>
          )}
          {pool.apiTotal != null && (
            <span className="text-white/30">
              {" "}
              · ~{pool.apiTotal.toLocaleString()} on BSC index
            </span>
          )}
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

      {pool.error && pageAgents.length === 0 && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {pool.error}
        </div>
      )}

      {pageAgents.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageAgents.map((a) => (
            <AgentCard key={a.id || a.agent_id} agent={a} />
          ))}
        </div>
      ) : (
        !pool.error && (
          <div className="mt-10">
            <EmptyState
              title="No agents match"
              body="Try clearing filters or a broader search."
              actionHref="/browse"
              actionLabel="Clear browse"
            />
          </div>
        )
      )}

      {(hasPrev || hasNext) && (
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {hasPrev && (
            <Link
              href={buildBrowseHref(filters, {
                page: String(safePage - 1),
                sort: filters.sort,
              })}
              className="btn-secondary !py-2 !text-sm"
            >
              ← Previous
            </Link>
          )}
          <span className="flex items-center text-xs text-white/40">
            Page {safePage} / {totalPages}
          </span>
          {hasNext && (
            <Link
              href={buildBrowseHref(filters, {
                page: String(safePage + 1),
                sort: filters.sort,
              })}
              className="btn-primary !py-2 !text-sm"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
