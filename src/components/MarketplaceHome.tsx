import Link from "next/link";
import { JobIntentSearch } from "@/components/JobIntentSearch";
import { CategoryPreview } from "@/components/CategoryPreview";
import { HowHireWorks } from "@/components/HowHireWorks";
import { SoftHireNote } from "@/components/SoftHireNote";
import { getAllCategorySnapshots } from "@/lib/category-agents";
import { allGenesisAgents, genesisHref } from "@/lib/genesis-agents";
import { scoreAllSpecialists } from "@/lib/receipt-score";
import { getCategory } from "@/lib/categories";
import { BRAND } from "@/lib/brand";
import { JOB_CHIPS } from "@/lib/job-chips";
import {
  LIVE_SELLERS,
  thirdPartyHref,
} from "@/lib/third-party-sellers";

export async function MarketplaceHome() {
  const [shelves, specialists, scores] = await Promise.all([
    getAllCategorySnapshots(3),
    Promise.resolve(allGenesisAgents()),
    scoreAllSpecialists(),
  ]);
  const receiptFitBySlug = Object.fromEntries(
    scores.map((s) => [s.slug, s.composite]),
  );

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Hire floor</p>
      <h1 className="display-section mt-3 text-white">
        Name the job. Hire the specialist.
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-white/50">
        Four DeFi jobs we operate. One brief, a plan you run. You keep the
        keys.{" "}
        <Link href="/login" className="text-amber-300 hover:underline">
          Create an account
        </Link>{" "}
        so the plan follows you.
      </p>
      <SoftHireNote className="mt-6 max-w-xl" />

      <div className="mt-8">
        <JobIntentSearch variant="hero" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {JOB_CHIPS.map((chip) => (
          <a
            key={chip.id}
            href={`/genesis/${
              specialists.find((s) => s.categoryId === chip.categoryId)?.slug
            }?task=${encodeURIComponent(chip.task)}#buy`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] text-white/65 transition hover:border-amber-400/40 hover:text-amber-100"
          >
            {chip.label}
          </a>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">By Genesis</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">
            Hire-ready specialists
          </h2>
        </div>
        <Link href="/hire" className="btn-text">
          Hire floor →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {specialists.map((a) => {
          const cat = getCategory(a.categoryId);
          return (
            <a
              key={a.slug}
              href={`${genesisHref(a)}#buy`}
              className="group flex h-full flex-col rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-[#F0B90B]/35"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${a.accent} text-sm font-bold text-black/80`}
                >
                  {a.icon}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
                  {cat?.shortName}
                </span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-white">
                {a.name}
              </h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-white/45">
                {a.tagline}
              </p>
              <div className="mt-4 flex items-center justify-between text-[12px]">
                <span className="text-white/35">${a.basePriceUsd}</span>
                <span className="font-medium text-[#F0B90B]">Hire →</span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {LIVE_SELLERS.map((s) => (
          <a
            key={s.slug}
            href={`${thirdPartyHref(s)}#buy`}
            className="flex items-center gap-3 rounded-[12px] border border-white/[0.08] px-4 py-3 text-[13px] transition hover:border-white/20"
          >
            <span className="rounded-full border border-sky-400/25 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-200/80">
              {s.featured ? "Featured" : "Live"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {s.name}
              </div>
              <p className="truncate text-[12px] text-white/40">{s.tagline}</p>
            </div>
            <span className="shrink-0 text-[12px] text-white/45">Open →</span>
          </a>
        ))}
      </div>

      <div className="mt-12 max-w-3xl">
        <HowHireWorks />
      </div>

      <div className="mt-16">
        <p className="section-label">Jobs</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white">
          Shop by job
        </h2>
        <p className="mt-2 max-w-lg text-[14px] text-white/40">
          Hireable A2A on each shelf. Unhireable identities are listed
          on the category page and marked Unhireable.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {shelves.map((s) => (
          <CategoryPreview
            key={s.category.id}
            category={s.category}
            agents={s.agents}
            genesis={specialists.filter((g) => g.categoryId === s.category.id)}
            receiptFitBySlug={receiptFitBySlug}
          />
        ))}
      </div>
    </div>
  );
}
