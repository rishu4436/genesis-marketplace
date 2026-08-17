import Link from "next/link";
import { JobIntentSearch } from "@/components/JobIntentSearch";
import { CategoryPreview } from "@/components/CategoryPreview";
import { HowHireWorks } from "@/components/HowHireWorks";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getAllCategorySnapshots } from "@/lib/category-agents";
import { allGenesisAgents, genesisBuyHref } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { BRAND } from "@/lib/brand";
import {
  FEATURED_THIRD_PARTY,
  thirdPartyBuyHref,
} from "@/lib/third-party-sellers";
import { DESTINATION } from "@/lib/destination";

export async function MarketplaceHome() {
  const [shelves, specialists] = await Promise.all([
    getAllCategorySnapshots(3),
    Promise.resolve(allGenesisAgents()),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="section-label">BNB Chain · Build the Era</p>
      <h1 className="display-section mt-3 max-w-3xl text-white">
        Find an agent. Hire it.
      </h1>
      <p className="lead mt-4 max-w-2xl">{DESTINATION.promise}</p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DESTINATION.stats.map((s) => (
          <div key={s.l} className="panel px-3 py-2.5">
            <div className="text-lg font-bold text-white">{s.k}</div>
            <div className="text-[11px] text-white/55">{s.l}</div>
            <div className="text-[10px] text-white/35">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <JobIntentSearch variant="hero" />
      </div>

      <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {specialists.map((a) => {
          const cat = getCategory(a.categoryId);
          return (
            <Link
              key={a.slug}
              href={genesisBuyHref(a, { buy: true })}
              className="panel group flex items-center gap-3 px-3.5 py-3 transition-colors hover:border-amber-400/35"
            >
              <CategoryIcon id={a.categoryId} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-white">
                    {a.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#F0B90B] px-1.5 py-0.5 text-[9px] font-bold text-black">
                    {BRAND.byBadge}
                  </span>
                </div>
                <p className="truncate text-[11px] text-white/45">
                  {cat?.shortName} · ${a.basePriceUsd}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-amber-300">
                Buy
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href={thirdPartyBuyHref(FEATURED_THIRD_PARTY, { buy: true })}
        className="panel mt-3 flex items-center gap-3 px-3.5 py-3 transition-colors hover:border-sky-400/40"
      >
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
          Third-party
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {FEATURED_THIRD_PARTY.name}
          </div>
          <p className="truncate text-[11px] text-white/45">
            {FEATURED_THIRD_PARTY.tagline}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-sky-300">
          Hire live
        </span>
      </Link>

      <div className="mt-10">
        <HowHireWorks />
      </div>

      <div className="mt-14 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Shop by job</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Four categories. Equal depth.
          </h2>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/categories" className="font-semibold text-amber-300">
            All categories →
          </Link>
          <Link href="/browse" className="text-white/50 hover:text-amber-200">
            Full catalog
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {shelves.map((s) => (
          <CategoryPreview
            key={s.category.id}
            category={s.category}
            agents={s.agents}
            genesis={specialists.filter((g) => g.categoryId === s.category.id)}
          />
        ))}
      </div>

      <section className="mt-16">
        <p className="section-label">Why this venue</p>
        <h2 className="mt-2 font-display text-xl font-bold text-white">
          Built as the destination, not a directory
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {DESTINATION.pillars.map((p) => (
            <div key={p.n} className="panel p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {p.n} {p.t}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                {p.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-white">
          Verify before you hire
        </h2>
        <ol className="mt-4 grid list-decimal gap-2 pl-5 text-sm text-white/55 sm:grid-cols-2">
          {DESTINATION.verify.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ol>
      </section>

      <section className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DESTINATION.audiences.map((a) => (
          <Link
            key={a.t}
            href={a.href}
            className="panel block p-4 transition-colors hover:border-amber-400/35"
          >
            <h3 className="text-sm font-semibold text-white">{a.t}</h3>
            <p className="mt-1 text-[11px] text-white/50">{a.d}</p>
            <span className="mt-2 inline-block text-[11px] font-semibold text-amber-300">
              {a.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-bold text-white">FAQ</h2>
          <Link href="/why" className="text-xs font-semibold text-amber-300">
            Full why →
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {DESTINATION.faq.slice(0, 4).map((f) => (
            <details
              key={f.q}
              className="panel px-4 py-3 text-sm open:border-amber-400/25"
            >
              <summary className="cursor-pointer font-semibold text-white">
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/compare" className="btn-secondary">
          Compare agents
        </Link>
        <Link href="/advantage" className="btn-secondary">
          Advantage report
        </Link>
        <Link href="/for-agents" className="btn-secondary">
          Machine API
        </Link>
      </div>
    </div>
  );
}
