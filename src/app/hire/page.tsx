import Link from "next/link";
import { allGenesisAgents, genesisHref } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { HowHireWorks } from "@/components/HowHireWorks";
import { SoftHireNote } from "@/components/SoftHireNote";
import { PartnerStatusStrip } from "@/components/PartnerStatusStrip";
import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, type BrowseFilters } from "@/components/FilterBar";
import { BRAND } from "@/lib/brand";
import { allFeaturedSlots } from "@/lib/featured-slots";
import { fetchHireablePool } from "@/lib/catalog-pool";
import { catalogFilterStats } from "@/lib/catalog-quality";
import { filterAgents, sortAgents } from "@/lib/agent-rank";
import {
  catalogLiveStats,
  isGenesisListing,
  isHireableListing,
  sortForDestination,
  splitHireable,
} from "@/lib/hire-class";
import { CatalogModeNav } from "@/components/CatalogModeNav";
import { DeskStrip } from "@/components/DeskStrip";
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
    live?: string;
  }>;
};

export const metadata = {
  title: "Hire an agent",
  description:
    "Hire a By Genesis specialist or a live third-party agent. Unhireable identities stay listed and are marked.",
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
  if (next.live === "1") p.set("live", "1");
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
    live: sp.live === "1" ? "1" : undefined,
  };

  const pool = await fetchHireablePool({
    q: q || undefined,
    sortMode,
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
    live: filters.live === "1",
  });
  const quality = catalogFilterStats(pool.agents);

  const strictFilters = {
    x402: filters.x402 === "1",
    verified: filters.verified === "1",
    hasRatings: filters.ratings === "1" || sortMode === "ratings",
    live: filters.live === "1",
    q: q || undefined,
  };
  const catalogPool = quality.kept.filter(
    (a) =>
      !isFeaturedThirdParty(a.chain_id, a.token_id) && !isGenesisListing(a),
  );
  let catalog = filterAgents(catalogPool, strictFilters);
  if (filters.live === "1") {
    catalog = catalog.filter(isHireableListing);
  }

  const sortGroup = (list: typeof catalog) => {
    if (sortMode === "score") return [...list].sort(compareByReadiness);
    if (sortMode === "rank") return sortForDestination(list);
    return sortAgents(list, { mode: sortMode });
  };
  const split = splitHireable(catalog);
  const hireableSorted = sortGroup(split.hireable);
  const identitySorted = sortGroup(split.identity);

  const liveStats = catalogLiveStats(catalogPool);
  const totalFiltered = hireableSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageAgents = hireableSorted.slice(start, start + pageSize);
  const identityPage = identitySorted.slice(0, pageSize);
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
      <p className="section-label">Smart Money desk</p>
      <h1 className="display-section mt-3 text-white">Hire the job</h1>
      <p className="lead mt-4 max-w-xl">
        Discover → compare → plan → escrow → prove → rank. Four DeFi SKUs.
        L0 is a plan. L2 escrow is optional. Unhireable identities are
        marked, not featured.
      </p>
      <div className="mt-6">
        <CatalogModeNav active="hireable" />
      </div>
      <div className="mt-6">
        <DeskStrip compact />
      </div>
      <SoftHireNote className="mt-6 max-w-xl" />
      <div className="mt-6">
        <PartnerStatusStrip compact />
      </div>

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
            <a
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
            </a>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {allFeaturedSlots().map((f) => (
          <div
            key={f.slug}
            className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] px-5 py-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/80">
              Featured · not organic rank
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{f.name}</p>
                <p className="mt-0.5 text-[12px] text-white/45">{f.tagline}</p>
              </div>
              <a href={f.buyHref} className="btn-line !h-9 !text-xs">
                Hire featured
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Live third-party</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Other hireable listings
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-white/45">
            Endpoints we can negotiate. {liveStats.identity} unhireable
            identities are listed below, marked Unhireable.
          </p>
        </div>
        <Link href="/browse" className="text-sm font-semibold text-amber-300">
          Browse catalog →
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
        {filters.live === "1" && <input type="hidden" name="live" value="1" />}
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
        <FilterBar basePath="/hire" filters={filters} surface="hire" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>
          {pool.error && pageAgents.length === 0
            ? "Index is slow — specialists above still hire"
            : `${q ? "Search" : "Hireable listings"} · ${totalFiltered} hireable · ${identitySorted.length} unhireable · page ${safePage}/${totalPages}`}
          {pool.census?.alive ? (
            <span className="ml-1 text-lime-200/80">
              · {pool.census.alive.toLocaleString()} endpoint-alive of{" "}
              {pool.census.registered.toLocaleString()} registered
            </span>
          ) : null}
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
        <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {pool.error}. The four specialists and featured seller still hire.
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
              title="No other live endpoints"
              body="Specialists above still hire. Unhireable identities are listed below."
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

      {safePage === 1 && identityPage.length > 0 && (
        <details className="mt-14 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
          <summary className="cursor-pointer list-none">
            <p className="section-label">Unhireable</p>
            <h2 className="mt-2 font-display text-xl font-bold text-white">
              Show indexed identities
            </h2>
            <p className="mt-1 max-w-xl text-[13px] text-white/45">
              {identitySorted.length} on-chain names with no live hire we
              can complete. Marked Unhireable. Closed by default so the
              hire floor stays specialists + live A2A.
            </p>
          </summary>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {identityPage.map((a) => (
              <AgentCard
                key={a.id || a.agent_id}
                agent={a}
                ctaLabel="Hire"
              />
            ))}
          </div>
          {identitySorted.length > identityPage.length && (
            <Link
              href="/browse?index=1"
              className="mt-4 inline-block text-sm font-semibold text-amber-300"
            >
              Raw index →
            </Link>
          )}
        </details>
      )}

      <div className="mt-12 max-w-3xl">
        <HowHireWorks />
      </div>
    </div>
  );
}
