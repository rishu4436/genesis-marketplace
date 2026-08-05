import Link from "next/link";
import type { Agent } from "@/lib/types";
import { agentHref, agentKey, shortAddress } from "@/lib/scan";
import { CompareToggle } from "@/components/CompareTray";
import type { CategoryId } from "@/lib/categories";
import { getCategory } from "@/lib/categories";

function scoreLabel(agent: Agent) {
  if (agent.average_score && agent.average_score > 0) {
    return `${agent.average_score.toFixed(1)}★`;
  }
  if (agent.total_score && agent.total_score > 0) {
    return `Score ${Number(agent.total_score).toFixed(0)}`;
  }
  return "New";
}

export function AgentCard({
  agent,
  categoryId,
  showCompare = true,
}: {
  agent: Agent;
  categoryId?: CategoryId;
  showCompare?: boolean;
}) {
  const desc =
    agent.description?.trim() ||
    "On-chain agent registered under ERC-8004 on BNB Smart Chain.";
  const cat = categoryId ? getCategory(categoryId) : null;

  return (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-400/40 hover:bg-white/[0.06]">
      <div className="flex items-start gap-3">
        <Link
          href={agentHref(agent)}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10"
        >
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
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={agentHref(agent)} className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white group-hover:text-amber-200">
                {agent.name || `Agent #${agent.token_id}`}
              </h3>
            </Link>
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
              {scoreLabel(agent)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/40">
            BSC · #{agent.token_id} · {shortAddress(agent.owner_address)}
            {cat && (
              <span className="text-white/30"> · {cat.shortName}</span>
            )}
          </p>
        </div>
      </div>

      <Link href={agentHref(agent)} className="mt-3 flex-1">
        <p className="line-clamp-2 text-xs leading-relaxed text-white/55">
          {desc}
        </p>
      </Link>

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
        <div className="ml-auto flex items-center gap-2">
          {showCompare && <CompareToggle agentKey={agentKey(agent)} />}
          <Link
            href={agentHref(agent)}
            className="text-[11px] font-medium text-amber-300/90"
          >
            Hire →
          </Link>
        </div>
      </div>
    </div>
  );
}
