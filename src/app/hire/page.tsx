import Link from "next/link";
import { allGenesisAgents, genesisHref } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HowHireWorks } from "@/components/HowHireWorks";
import { BRAND } from "@/lib/brand";

type Props = {
  searchParams: Promise<{ agent?: string }>;
};

export const metadata = {
  title: "Buy an agent",
  description:
    "Buy By Genesis specialists or any indexed agent — one click, structured deliverable.",
};

export default async function HirePage({ searchParams }: Props) {
  const { agent } = await searchParams;
  const [chainId, tokenId] = (agent || "").split(":");
  const specialists = allGenesisAgents();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Buy</p>
      <h1 className="display-section mt-3 text-white">Buy an agent</h1>
      <p className="lead mt-3 max-w-xl">
        One action: describe the job and buy. You get a structured deliverable
        under My hires. Start with a hire-ready {BRAND.byBadge} specialist.
      </p>

      {agent && chainId && tokenId && (
        <div className="panel mt-6 border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Selected catalog agent:{" "}
          <Link
            href={`/agents/${chainId}/${tokenId}`}
            className="font-semibold underline"
          >
            chain {chainId} · token {tokenId}
          </Link>
          {" — "}
          open that page and use <strong>Buy agent</strong>.
        </div>
      )}

      <div className="mt-8">
        <HowHireWorks />
      </div>

      <p className="section-label mt-12">Buy-ready specialists</p>
      <p className="body-sm mt-2 max-w-xl">
        Pick one, land on the buy panel — price and ETA shown up front.
      </p>

      <div className="mt-5 space-y-2.5">
        {specialists.map((a) => {
          const cat = getCategory(a.categoryId);
          return (
            <Link
              key={a.slug}
              href={`${genesisHref(a)}#buy`}
              className="panel group flex items-center gap-3.5 px-3.5 py-3.5 transition-colors hover:border-amber-400/30 hover:bg-white/[0.04]"
            >
              <CategoryIcon id={a.categoryId} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight text-white group-hover:text-amber-50">
                    {a.name}
                  </h2>
                  <span className="rounded-full bg-[#F0B90B] px-2 py-0.5 text-[10px] font-bold text-black">
                    {BRAND.byBadge}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    Registered
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/45">
                  {cat?.name || a.categoryId} · ~{a.etaMinutes}m deliverable
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-white/55">
                  {a.tagline}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black">
                Buy · ${a.basePriceUsd}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="body-sm mt-8">
        Or buy any indexed listing from{" "}
        <Link
          href="/browse"
          className="font-semibold text-amber-300 hover:text-amber-200"
        >
          All agents
        </Link>{" "}
        /{" "}
        <Link
          href="/categories"
          className="font-semibold text-amber-300 hover:text-amber-200"
        >
          Categories
        </Link>
        .
      </p>
    </div>
  );
}
