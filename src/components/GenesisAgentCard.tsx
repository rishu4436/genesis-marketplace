import Link from "next/link";
import type { GenesisAgent } from "@/lib/genesis-agents";
import { genesisHref, genesisToAgentCard } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { BRAND } from "@/lib/brand";
import { ScorePentagon } from "@/components/ScorePentagon";
import {
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";

export function GenesisAgentCard({ agent }: { agent: GenesisAgent }) {
  const cat = getCategory(agent.categoryId);
  const card = genesisToAgentCard(agent);
  // Same boosts as dashboard specialists so cards match scored specialists
  let axes = computeAxes(card).map((ax) => {
    if (ax.id === "commerce") {
      return {
        ...ax,
        value: Math.min(100, ax.value + 25),
        source: "marketplace specialist · hire-ready",
      };
    }
    if (ax.id === "trust") {
      return {
        ...ax,
        value: Math.min(100, ax.value + 20),
        source: "operated by Genesis",
      };
    }
    return ax;
  });
  const composite = compositeFromAxes(axes);
  const gid = `genesis-${agent.slug}`;

  return (
    <Link
      href={`${genesisHref(agent)}#buy`}
      className="group flex flex-col rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.1] to-white/[0.02] p-4 transition-colors hover:border-amber-400/40"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${agent.accent} text-lg font-bold text-black/80 shadow-md`}
        >
          {agent.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold tracking-tight text-white group-hover:text-amber-50">
              {agent.name}
            </h3>
            <span
              className="shrink-0 rounded-full bg-[#F0B90B] px-2 py-0.5 text-[10px] font-bold text-black"
              title={`${BRAND.specialistLabel}: built and operated by the ${BRAND.name} marketplace`}
            >
              {BRAND.byBadge}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-white/45">
            {BRAND.specialistLabel}
            {cat ? ` · ${cat.shortName}` : ""} · ~{agent.etaMinutes}m
          </p>
          <p className="mt-1 text-[10px] font-medium text-emerald-300/80">
            Registered · ${agent.basePriceUsd}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-1 items-start gap-3">
        <div className="shrink-0 rounded-xl border border-amber-400/20 bg-[#080a10] p-1">
          <ScorePentagon
            axes={axes}
            composite={composite}
            size={88}
            showLabels={false}
            variant="compact"
            gradientId={gid}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 text-xs leading-relaxed text-white/60">
            {agent.tagline}
          </p>
          <p className="mt-2 line-clamp-1 text-[10px] tabular-nums text-white/35">
            {axes
              .map((a) =>
                a.absent ? `${a.short} —` : `${a.short} ${Math.round(a.value)}`,
              )
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
        {agent.pcsRelated && (
          <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
            PancakeSwap
          </span>
        )}
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
          Ready
        </span>
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/35">
          Unrated
        </span>
        <span className="ml-auto rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-semibold text-black">
          Buy · ${agent.basePriceUsd}
        </span>
      </div>
    </Link>
  );
}
