import Link from "next/link";
import { allGenesisAgents, genesisHref } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { HowHireWorks } from "@/components/HowHireWorks";
import { SoftHireNote } from "@/components/SoftHireNote";
import { BRAND } from "@/lib/brand";
import { featuredSlotsForJob } from "@/lib/featured-slots";

type Props = {
  searchParams: Promise<{ agent?: string }>;
};

export const metadata = {
  title: "Hire an agent",
  description:
    "Hire a By Genesis specialist — one click, structured plan, you keep the keys.",
};

export default async function HirePage({ searchParams }: Props) {
  const { agent } = await searchParams;
  const [chainId, tokenId] = (agent || "").split(":");
  const specialists = allGenesisAgents();

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Hire</p>
      <h1 className="display-section mt-3 text-white">Pick a specialist</h1>
      <p className="lead mt-4 max-w-xl">
        Four jobs. Four operators we run. Describe the work, get a plan, keep
        the keys.
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

      <div className="mt-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-black/25">
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
              Open featured
            </Link>
          </div>
        </div>
      ))}

      <div className="mt-12 max-w-3xl">
        <HowHireWorks />
      </div>
    </div>
  );
}
