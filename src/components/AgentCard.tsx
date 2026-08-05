import Link from "next/link";
import type { Agent } from "@/lib/types";
import { agentHref, shortAddress } from "@/lib/scan";

function scoreLabel(agent: Agent) {
  if (agent.average_score && agent.average_score > 0) {
    return `${agent.average_score.toFixed(1)}★`;
  }
  if (agent.total_score && agent.total_score > 0) {
    return `Score ${agent.total_score.toFixed(0)}`;
  }
  return "New";
}

export function AgentCard({ agent }: { agent: Agent }) {
  const desc =
    agent.description?.trim() ||
    "On-chain agent registered under ERC-8004 on BNB Smart Chain.";

  return (
    <Link
      href={agentHref(agent)}
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-400/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
          {agent.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-amber-300">
              ◆
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-white group-hover:text-amber-200">
              {agent.name || `Agent #${agent.token_id}`}
            </h3>
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
              {scoreLabel(agent)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/40">
            BSC · #{agent.token_id} · {shortAddress(agent.owner_address)}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-white/55">
        {desc}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {agent.x402_supported && (
          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
            x402
          </span>
        )}
        {agent.is_verified && (
          <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
            Verified
          </span>
        )}
        {(agent.total_feedbacks ?? 0) > 0 && (
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
            {agent.total_feedbacks} feedback
          </span>
        )}
        <span className="ml-auto text-[11px] font-medium text-amber-300/90 opacity-0 transition group-hover:opacity-100">
          View & hire →
        </span>
      </div>
    </Link>
  );
}
