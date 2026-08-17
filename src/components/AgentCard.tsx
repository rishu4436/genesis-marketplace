import Link from "next/link";
import type { Agent } from "@/lib/types";
import { agentHref, agentKey, shortAddress } from "@/lib/scan";
import { CompareToggle } from "@/components/CompareTray";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ScorePentagon } from "@/components/ScorePentagon";
import type { CategoryId } from "@/lib/categories";
import { getCategory } from "@/lib/categories";
import {
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";
import { isFeaturedThirdParty } from "@/lib/third-party-sellers";
import { hireClassForAgent, hireClassLabel } from "@/lib/hire-class";
import {
  formatOnchainRating,
  hasOnchainRating,
} from "@/lib/feedback-score";

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
  const axes = computeAxes(agent);
  const composite = compositeFromAxes(axes);
  const gid = `card-${agent.chain_id}-${String(agent.token_id).replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-amber-400/35 hover:bg-white/[0.06]">
      <div className="flex items-start gap-3">
        <Link href={agentHref(agent)} className="shrink-0">
          <AgentAvatar
            src={agent.image_url}
            name={agent.name || `Agent #${agent.token_id}`}
            size="sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={agentHref(agent)} className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white group-hover:text-amber-200">
                {agent.name || `Agent #${agent.token_id}`}
              </h3>
            </Link>
            <span
              className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-200"
              title="Hire readiness — listing quality, not an on-chain rating"
            >
              {Math.round(composite)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/40">
            BSC · #{agent.token_id} · {shortAddress(agent.owner_address)}
            {cat && (
              <span className="text-white/30"> · {cat.shortName}</span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {(agent.agent_id || agent.token_id != null) && (
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                Registered
              </span>
            )}
            {(() => {
              const cls = hireClassForAgent(agent);
              if (cls === "live" || isFeaturedThirdParty(agent.chain_id, agent.token_id)) {
                return (
                  <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                    {hireClassLabel("live")}
                  </span>
                );
              }
              return (
                <span className="text-[10px] text-white/35">
                  {hireClassLabel("indexed")}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Per-agent pentagon + blurb */}
      <Link
        href={agentHref(agent)}
        className="mt-3 flex flex-1 items-start gap-3"
      >
        <div className="shrink-0 rounded-xl border border-amber-400/15 bg-[#080a10] p-1">
          <ScorePentagon
            axes={axes}
            composite={composite}
            size={88}
            showLabels={false}
            variant="compact"
            gradientId={gid}
          />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="line-clamp-3 text-xs leading-relaxed text-white/55">
            {desc}
          </p>
          <p className="mt-2 line-clamp-1 text-[10px] tabular-nums text-white/30">
            {axes
              .map((a) =>
                a.absent ? `${a.short} —` : `${a.short} ${Math.round(a.value)}`,
              )
              .join(" · ")}
          </p>
        </div>
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
        {hasOnchainRating(agent) ? (
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
            {formatOnchainRating(agent)}
            {agent.total_feedbacks
              ? ` · ${agent.total_feedbacks}`
              : ""}
          </span>
        ) : (
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/35">
            Unrated
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {showCompare && <CompareToggle agentKey={agentKey(agent)} />}
          <Link
            href={`${agentHref(agent)}#buy`}
            className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-black transition hover:bg-amber-300"
          >
            Buy
          </Link>
        </div>
      </div>
    </div>
  );
}
