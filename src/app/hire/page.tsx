import Link from "next/link";
import { allGenesisAgents, genesisHref } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { HowHireWorks } from "@/components/HowHireWorks";
import { SoftHireNote } from "@/components/SoftHireNote";
import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, type BrowseFilters } from "@/components/FilterBar";
import { BRAND } from "@/lib/brand";
import { featuredSlotsForJob } from "@/lib/featured-slots";
import { fetchHireablePool } from "@/lib/catalog-pool";
import { catalogFilterStats } from "@/lib/catalog-quality";
import { filterAgents, sortAgents } from "@/lib/agent-rank";
import { sortForDestination } from "@/lib/hire-class";
import {
  compareByReadiness,
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";
import { isFeaturedThirdParty } from "@/lib/third-party-sellers";
import { agentScore } from "@/lib/agent-score";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    agent?: string;
    q?: string;
    page?: string;
    sort?: string;
    x402?: string;
    verified?: string;
    ratings?: string;
  }>;
};

export const metadata = {
  title: "Hire an agent",
  description:
    "Hire a By Genesis specialist or a hireable 8004scan listing — structured plan, you keep the keys.",
};

function buildHireHref(
  filters: BrowseFilters,
  patch: Partial<BrowseFilters> = {},
) {
  const next = { ...filters, ...patch };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.sort) p.set("sort", next.sort);
  if (next.x402 === "1") p.set("x402", "1");
  if (next.verified === "1") p.set("verified", "1");
  if (next.ratings === "1") p.set("ratings", "1");
  if (next.page && next.page !== "1") p.set("page", next.page);
  const s = p.toString();
  return s ? `/hire?${s}` : "/hire";
}

export default async function HirePage({ searchParams }: Props) {
  const sp = await searchParams;
  const agent = sp.agent;
  const [chainId, tokenId] = (agent || "").split(":");
  const specialists = allGenesisAgents();
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1") || 1);
  const pageSize = 24;

  const sortMode =
    sp.sort === "score" ||
    sp.sort === "newest" ||
    sp.sort === "ratings"
      ? sp.sort
      : "rank";

  const filters: BrowseFilters = {
    q: q || undefined,
    page: String(page),
    sort: sortMode === "rank" ? undefined : sortMode,
    x402: sp.x402,
    verified: sp.verified,
    ratings: sp.ratings === "1" ? "1" : undefined,
  };

  const pool = await fetchHireablePool({
    q: q || undefined,
    sortMode,
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
  });
  const quality = catalogFilterStats(pool.agents);

  const strictFilters = {
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
    hasRatings: filters.ratings === "1" || sortMode === "ratings",
  };
  let catalog = filterAgents(quality.kept, strictFilters).filter(
    (a) => !isFeaturedThirdParty(a.chain_id, a.token_id),
  );
  let relaxed = false;
  if (catalog.length === 0 && quality.kept.length > 0) {
    catalog = filterAgents(quality.kept, {
      x402: false,
      verified: false,
      hasRatings: false,
    }).filter((a) => !isFeaturedThirdParty(a.chain_id, a.token_id));
    relaxed = catalog.length > 0;
  }

  if (sortMode === "score") {
    catalog = [...catalog].sort(compareByReadiness);
  } else if (sortMode === "rank") {
    catalog = sortForDestination(catalog);
  } else {
    catalog = sortAgents(catalog, { mode: sortMode });
  }

  const totalFiltered = catalog.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageAgents = catalog.slice(start, start + pageSize);
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
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Hire</p>
      <h1 className="display-section mt-3 text-white">Hire an agent</h1>
      <p className="lead mt-4 max-w-xl">
        Four jobs we operate, then hireable listings from the BSC index.
        Featured is labeled — it is not organic rank. Soft hire: you keep the
        keys.
      </p>
      <SoftHireNote className="mt-6 max-w-xl" />

      {agent && chainId && tokenId && (
        <div className="mt-6 max-w-xl rounded-2xl border border-[#F0B90B]/25 bg-[#F0B90B]/[0.06] px-4 py-3 text-sm text-amber-100">
          Selected catalog agent:{" "}
          <Link
            href={`/agents/${chainId}/${tokenId}`}
            className="font-semibold underline"
          >
            chain {chainId} · token {tokenId}
          </Link>
          {" — "}
          open that page and hire.
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">By Genesis</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Four specialists
          </h2>
        </div>
        <Link href="/categories" className="text-sm font-semibold text-amber-300">
          Four jobs →
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-black/25">
        {specialists.map((a, i) => {
          const cat = getCategory(a.categoryId);
          return (
            <Link
              key={a.slug}
              href={`${genesisHref(a)}#buy`}
              className={`grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[auto_1fr_auto_auto] ${
                i > 0 ? "border-t border-white/[0.06]" : ""
              }`}
            >
              <span
                className={`hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br sm:flex ${a.accent} text-sm font-bold text-black/80`}
              >
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-white">
                    {a.name}
                  </span>
                  <span className="rounded-full bg-[#F0B90B] px-1.5 py-0.5 text-[9px] font-bold text-black">
                    {BRAND.byBadge}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-white/40">
                  {cat?.name} · {a.tagline}
                </span>
              </span>
              <span className="hidden text-right sm:block">
                <span className="block font-display text-lg text-white">
                  ${a.basePriceUsd}
                </span>
                <span className="text-[11px] text-white/35">
                  ~{a.etaMinutes}m
                </span>
              </span>
              <span className="rounded-full bg-[#F0B90B] px-3.5 py-1.5 text-xs font-semibold text-black">
                Hire
              </span>
            </Link>
          );
        })}
      </div>

      {featuredSlotsForJob("rebalancing").map((f) => (
        <div
          key={f.slug}
          className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] px-5 py-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/80">
            Featured · not organic rank
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{f.name}</p>
              <p className="mt-0.5 text-[12px] text-white/45">{f.tagline}</p>
            </div>
            <Link href={f.buyHref} className="btn-line !h-9 !text-xs">
              Hire featured
            </Link>
          </div>
        </div>
      ))}

      <div className="mt-14 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">8004scan</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            More hireable agents
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-white/45">
            Live third-party first, then indexed identities. Low-signal
            collectibles stay hidden. Stars are a filter, not the default rank.
          </p>
        </div>
        <Link href="/browse" className="text-sm font-semibold text-amber-300">
          Full index →
        </Link>
      </div>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row" action="/hire">
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
            href={buildHireHref({ ...filters, q: chip, page: "1" })}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60 transition hover:border-amber-400/40 hover:text-amber-200"
          >
            {chip}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <FilterBar basePath="/hire" filters={filters} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>
          {pool.error && pageAgents.length === 0
            ? "Catalog unavailable"
            : `${q ? "Search" : "Hireable listings"} · ${totalFiltered} loaded · page ${safePage}/${totalPages}`}
          {relaxed && (
            <span className="ml-1 text-amber-200/70">
              · no exact filter match — showing closest listings
            </span>
          )}
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
      </div>

      {pool.error && pageAgents.length === 0 && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {pool.error}
        </div>
      )}

      {pageAgents.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageAgents.map((a) => (
            <AgentCard
              key={a.id || a.agent_id}
              agent={a}
              ctaLabel="Hire"
            />
          ))}
        </div>
      ) : (
        !pool.error && (
          <div className="mt-10">
            <EmptyState
              title="No catalog matches"
              body="Specialists above stay hireable. Try a broader search or clear filters."
              actionHref="/hire"
              actionLabel="Clear catalog filters"
            />
          </div>
        )
      )}

      {(hasPrev || hasNext) && (
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {hasPrev && (
            <Link
              href={buildHireHref(filters, {
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
              href={buildHireHref(filters, {
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

      <div className="mt-12 max-w-3xl">
        <HowHireWorks />
      </div>
    </div>
  );
}
