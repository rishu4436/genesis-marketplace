import Link from "next/link";
import type { GenesisAgent } from "@/lib/genesis-agents";
import { genesisHref } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";

export function GenesisAgentCard({ agent }: { agent: GenesisAgent }) {
  const cat = getCategory(agent.categoryId);

  return (
    <Link
      href={genesisHref(agent)}
      className="group flex flex-col rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-white/[0.03] p-4 transition hover:border-amber-400/50 hover:from-amber-400/15"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${agent.accent} text-lg font-bold text-black/80`}
        >
          {agent.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-white group-hover:text-amber-100">
              {agent.name}
            </h3>
            <span className="shrink-0 rounded-full bg-[#F0B90B] px-2 py-0.5 text-[10px] font-bold text-black">
              Genesis
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/45">
            {cat?.shortName} · from ${agent.basePriceUsd} · ~{agent.etaMinutes}m
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-white/60">
        {agent.tagline}. {agent.description.slice(0, 100)}…
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.x402 && (
          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
            x402
          </span>
        )}
        {agent.pcsRelated && (
          <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
            PancakeSwap
          </span>
        )}
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
          ERC-8183 hire
        </span>
        <span className="ml-auto text-[11px] font-medium text-amber-300">
          Hire →
        </span>
      </div>
    </Link>
  );
}
