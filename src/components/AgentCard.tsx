import Link from "next/link";
import type { Agent } from "@/lib/types";
import { agentKey, shortAddress } from "@/lib/scan";
import { CompareToggle } from "@/components/CompareTray";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ScorePentagon } from "@/components/ScorePentagon";
import type { CategoryId } from "@/lib/categories";
import { getCategory } from "@/lib/categories";
import {
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";
import {
  hireClassForAgent,
  listingHref,
} from "@/lib/hire-class";
import {
  capabilityBadge,
  capabilityForAgent,
  listingCta,
} from "@/lib/capability";
import { jobTicketForAgent } from "@/lib/job-ticket";
import { JobTicketStrip } from "@/components/JobTicketStrip";

export function AgentCard({
  agent,
  categoryId,
  showCompare = true,
  ctaLabel = "Buy",
}: {
  agent: Agent;
  categoryId?: CategoryId;
  showCompare?: boolean;
  ctaLabel?: string;
}) {
  const desc =
    agent.description?.trim() ||
    "On-chain agent registered under ERC-8004 on BNB Smart Chain.";
  const cat = categoryId ? getCategory(categoryId) : null;
  const axes = computeAxes(agent);
  const composite = compositeFromAxes(axes);
  const gid = `card-${agent.chain_id}-${String(agent.token_id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const href = listingHref(agent);
  const cls = hireClassForAgent(agent);
  const cap = capabilityForAgent(agent);
  const capBadge = capabilityBadge(cap);
  const cta = listingCta(agent);
  const canHire = cta.hire;
  const ticket = jobTicketForAgent(agent);
  const actionLabel = cta.label;
  const actionHref = cta.hire ? `${href}#buy` : href;

  return (
    <div
      className={`group flex flex-col rounded-2xl border p-4 transition-colors ${
        canHire
          ? "border-white/10 bg-white/[0.03] hover:border-amber-400/35 hover:bg-white/[0.06]"
          : "border-rose-500/20 bg-rose-500/[0.04] hover:border-rose-400/35"
      }`}
    >
      <div className="flex items-start gap-3">
        <Link href={href} className="shrink-0">
          <AgentAvatar
            src={agent.image_url}
            name={agent.name || `Agent #${agent.token_id}`}
            size="sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="min-w-0">
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
            {ticket.passport}
            {shortAddress(agent.owner_address)
              ? ` · ${shortAddress(agent.owner_address)}`
              : ""}
            {cat && (
              <span className="text-white/30"> · {cat.shortName}</span>
            )}

          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {cls === "genesis" && (
              <span className="rounded-md bg-[#F0B90B] px-1.5 py-0.5 text-[10px] font-bold text-black">
                By Genesis
              </span>
            )}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                cap === "delivery-ready"
                  ? "bg-emerald-500/15 text-emerald-200"
                  : cap === "quote-ready"
                    ? "bg-sky-500/15 text-sky-200"
                    : "bg-rose-500/20 text-rose-200"
              }`}
              title={capBadge.title}
            >
              {capBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Per-agent pentagon + blurb */}
      <Link
        href={href}
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
          <p className="line-clamp-2 text-xs leading-relaxed text-white/55">
            {desc}
          </p>
          <JobTicketStrip ticket={ticket} dense />
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
        <div className="ml-auto flex items-center gap-2">
          {showCompare && <CompareToggle agentKey={agentKey(agent)} />}
          <a
            href={actionHref}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              canHire
                ? "bg-amber-400 text-black hover:bg-amber-300"
                : "border border-white/15 bg-white/5 text-white/70 hover:border-white/25"
            }`}
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
