import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, type BrowseFilters } from "@/components/FilterBar";
import { JobFloor } from "@/components/JobFloor";
import { dedupeAgents } from "@/lib/scan";
import { fetchHireablePool } from "@/lib/catalog-pool";
import { filterAgents, sortAgents } from "@/lib/agent-rank";
import { agentScore } from "@/lib/agent-score";
import {
  compareByReadiness,
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";
import { catalogFilterStats } from "@/lib/catalog-quality";
import { sortForDestination } from "@/lib/hire-class";
import { allGenesisAgents, genesisToAgentCard } from "@/lib/genesis-agents";
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

  const pool = await fetchHireablePool({ q: q || undefined, sortMode });
  const genesisCards = allGenesisAgents().map((g) => genesisToAgentCard(g));
  const merged = dedupeAgents([...genesisCards, ...pool.agents]);
  const quality = catalogFilterStats(merged);

  let agents = filterAgents(quality.kept, {
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
    hasRatings: filters.ratings === "1" || sortMode === "ratings",
  });

  // CRITICAL: sort the FULL list, then slice — never sort one API page alone
  if (sortMode === "score") {
    agents = [...agents].sort(compareByReadiness);
  } else if (sortMode === "rank") {
    agents = sortForDestination(agents);
  } else {
    agents = sortAgents(agents, { mode: sortMode });
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
      ? Math.min(
          ...pageAgents.map((a) =>
            sortMode === "score"
              ? compositeFromAxes(computeAxes(a))
              : agentScore(a),
          ),
        )
      : 0;
  const pageMax =
    pageAgents.length > 0
      ? Math.max(
          ...pageAgents.map((a) =>
            sortMode === "score"
              ? compositeFromAxes(computeAxes(a))
              : agentScore(a),
          ),
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="max-w-2xl">
        <p className="section-label">Index</p>
        <h1 className="display-section mt-3 text-white">Hire floor, then index</h1>
        <p className="lead mt-3">
          Specialists first. Live third-party next. 8004scan stars are a
          filter, not the default rank. This page is the catalog — hire
          starts at /hire.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/hire" className="btn-primary !py-2 !text-sm">
          Hire specialists
        </Link>
        <Link href="/categories" className="btn-secondary !py-2 !text-sm">
          Four jobs
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
              · sorted by hire readiness · this page {pageMax.toFixed(0)}–
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
