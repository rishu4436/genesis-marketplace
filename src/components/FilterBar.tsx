import Link from "next/link";

export type BrowseFilters = {
  q?: string;
  sort?: string;
  x402?: string;
  verified?: string;
  ratings?: string;
  live?: string;
  index?: string;
  page?: string;
};

function hrefWith(base: string, current: BrowseFilters, patch: BrowseFilters) {
  const p = new URLSearchParams();
  const next = { ...current, ...patch };
  if (next.q) p.set("q", next.q);
  // Persist sort on every link (score/ratings/newest) so paging never drops it
  if (next.sort && next.sort !== "rank") p.set("sort", next.sort);
  if (next.x402 === "1") p.set("x402", "1");
  if (next.verified === "1") p.set("verified", "1");
  if (next.ratings === "1") p.set("ratings", "1");
  if (next.live === "1") p.set("live", "1");
  if (next.index === "1") p.set("index", "1");
  if (next.page && next.page !== "1") p.set("page", next.page);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

export function FilterBar({
  basePath = "/browse",
  filters,
}: {
  basePath?: string;
  filters: BrowseFilters;
}) {
  const chip = (
    active: boolean,
    label: string,
    patch: BrowseFilters,
  ) => (
    <Link
      href={hrefWith(basePath, filters, { ...patch, page: "1" })}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-[#F0B90B] text-black"
          : "border border-white/10 bg-white/5 text-white/65 hover:border-amber-400/30 hover:text-amber-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
          Sort
        </span>
        {chip(!filters.sort || filters.sort === "rank", "Best match", {
          sort: "rank",
        })}
        {chip(filters.sort === "score", "Ready", { sort: "score" })}
        {chip(filters.sort === "ratings", "Rated only", { sort: "ratings" })}
        {chip(filters.sort === "newest", "Newest", { sort: "newest" })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
          Filters
        </span>
        {chip(filters.x402 === "1", "x402 pay", {
          x402: filters.x402 === "1" ? undefined : "1",
        })}
        {chip(filters.verified === "1", "Verified", {
          verified: filters.verified === "1" ? undefined : "1",
        })}
        {chip(filters.ratings === "1", "Has ratings", {
          ratings: filters.ratings === "1" ? undefined : "1",
        })}
        {chip(filters.live === "1", "Live A2A", {
          live: filters.live === "1" ? undefined : "1",
        })}
        {chip(filters.index === "1", "Full index", {
          index: filters.index === "1" ? undefined : "1",
        })}
        {(filters.x402 ||
          filters.verified ||
          filters.ratings ||
          filters.live ||
          filters.index ||
          filters.sort) && (
          <Link
            href={filters.q ? `${basePath}?q=${encodeURIComponent(filters.q)}` : basePath}
            className="text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
          >
            Clear
          </Link>
        )}
      </div>
    </div>
  );
}
