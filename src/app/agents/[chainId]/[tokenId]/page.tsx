import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgentSafe,
  listFeedbacksSafe,
  explorerAgentUrl,
  shortAddress,
  agentKey,
} from "@/lib/scan";
import { matchCategory, getCategory } from "@/lib/categories";
import { getRelatedAgents } from "@/lib/category-agents";
import { HireWizard } from "@/components/HireWizard";
import { AgentCard } from "@/components/AgentCard";
import { AgentAvatar } from "@/components/AgentAvatar";
import { CompareToggle } from "@/components/CompareTray";
import { ScoreAxisList, ScorePentagon } from "@/components/ScorePentagon";
import {
  featuresFromAgent,
  isAgentRegistered,
} from "@/components/AgentListingPanel";
import { TrustPassport } from "@/components/TrustPassport";
import { rankScore } from "@/lib/agent-rank";
import { getCategoryDepth } from "@/lib/category-depth";
import {
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";
import { isFeaturedThirdParty } from "@/lib/third-party-sellers";

export const revalidate = 90;

type Props = {
  params: Promise<{ chainId: string; tokenId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { chainId, tokenId } = await params;
  const res = await getAgentSafe(Number(chainId), tokenId);
  return {
    title: res.data?.name || `Agent #${tokenId}`,
    description: res.data?.description,
  };
}

export default async function AgentDetailPage({ params }: Props) {
  const { chainId, tokenId } = await params;
  const cid = Number(chainId);
  if (!Number.isFinite(cid)) notFound();

  const agentRes = await getAgentSafe(cid, tokenId);
  const agent = agentRes.data;

  if (!agent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
          {agentRes.error || "Agent not found"}
        </div>
        <Link href="/browse" className="mt-6 inline-block text-sm text-amber-300">
          ← Back to marketplace
        </Link>
      </div>
    );
  }

  const [fbRes, related] = await Promise.all([
    listFeedbacksSafe({ chainId: cid, tokenId, limit: 10 }),
    getRelatedAgents(agent, 4),
  ]);
  const feedbacks = fbRes.data || [];

  const categoryId = matchCategory(agent.name || "", agent.description || "");
  const category = categoryId ? getCategory(categoryId) : null;
  const scanUrl = explorerAgentUrl(agent);
  const fit = rankScore(agent, categoryId || undefined);
  const axes = computeAxes(agent);
  const composite = compositeFromAxes(axes);
  const pentId = `agent-${agent.chain_id}-${String(agent.token_id).replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/browse"
          className="text-xs font-medium text-white/45 hover:text-amber-300"
        >
          ← Marketplace
        </Link>
        <CompareToggle agentKey={agentKey(agent)} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <AgentAvatar
              src={agent.image_url}
              name={agent.name || `Agent #${agent.token_id}`}
              size="lg"
              className="!rounded-2xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {agent.name || `Agent #${agent.token_id}`}
                </h1>
                {isAgentRegistered(agent) && (
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                    Registered
                  </span>
                )}
                {agent.is_verified && (
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-white/50">
                Chain {agent.chain_id}
                {agent.is_testnet ? " (testnet)" : " · mainnet"} · Token #
                {agent.token_id}
                {category && (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      href={`/categories/${category.id}`}
                      className="text-amber-300 hover:underline"
                    >
                      {category.name}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                {agent.description ||
                  "No description provided on-chain. Identity is still verifiable via ERC-8004."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href="#buy"
                  className="btn-primary !px-4 !py-2 !text-sm lg:hidden"
                >
                  Buy · $10
                </a>
                <span className="text-xs text-white/40">
                  One brief → structured deliverable
                </span>
              </div>
            </div>
          </div>

          {/* Per-agent Genesis pentagon */}
          <section
            id="score"
            className="mt-8 scroll-mt-24 rounded-2xl border border-amber-400/20 bg-white/[0.03] p-5 sm:p-6"
          >
            <p className="section-label">Marketplace score</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
              Pentagon index
            </h2>
            <p className="body-sm mt-1.5 max-w-xl">
              Genesis 5-axis score for this agent — Reputation · Trust · Reach ·
              Commerce · Fitness (partner-fed).
            </p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(260px,300px)_1fr] lg:items-center">
              <div className="flex flex-col items-center">
                <ScorePentagon
                  axes={axes}
                  composite={composite}
                  size={260}
                  title={agent.name || `Agent #${agent.token_id}`}
                  gradientId={pentId}
                />
              </div>
              <div className="max-w-md">
                <ScoreAxisList axes={axes} />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { label: "Composite", value: String(Math.round(composite)) },
                    { label: "Fit", value: fit.toFixed(0) },
                    {
                      label: "Partner total",
                      value:
                        agent.total_score && agent.total_score > 0
                          ? Number(agent.total_score).toFixed(0)
                          : "—",
                    },
                    {
                      label: "Avg feedback",
                      value:
                        agent.average_score && agent.average_score > 0
                          ? agent.average_score.toFixed(1)
                          : "—",
                    },
                    {
                      label: "Feedbacks",
                      value: String(agent.total_feedbacks ?? 0),
                    },
                    {
                      label: "Stars",
                      value: String(agent.star_count ?? 0),
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-white/40">
                        {m.label}
                      </div>
                      <div className="mt-0.5 text-base font-semibold tabular-nums text-white">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <TrustPassport
            agent={agent}
            registered={isAgentRegistered(agent)}
            registrationDetail={
              isAgentRegistered(agent)
                ? `On-chain identity indexed from ERC-8004${
                    agent.owner_address
                      ? ` · owner ${shortAddress(agent.owner_address, 4)}`
                      : ""
                  }${
                    category ? ` · mapped to ${category.name}` : ""
                  }.`
                : "No registration signals in the partner index for this agent."
            }
            features={featuresFromAgent(agent)}
            samplePreview={
              categoryId
                ? {
                    title: getCategoryDepth(categoryId).sampleOutputTitle,
                    body: getCategoryDepth(categoryId).sampleOutputBody,
                  }
                : undefined
            }
          />

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">On-chain identity</h2>
            <dl className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <Row label="Agent ID" value={agent.agent_id || "—"} mono />
              <Row
                label="Owner"
                value={shortAddress(agent.owner_address, 6)}
                mono
              />
              <Row
                label="Contract"
                value={shortAddress(agent.contract_address, 6)}
                mono
              />
              <Row
                label="Protocols"
                value={
                  agent.supported_protocols?.length
                    ? agent.supported_protocols.join(", ")
                    : "—"
                }
              />
              <Row
                label="8004scan"
                value="Open profile ↗"
                href={scanUrl}
              />
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">Recent feedback</h2>
            {feedbacks.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">
                No feedback indexed yet. Reputation builds as hirers leave
                on-chain signals.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {feedbacks.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex items-center justify-between text-xs text-white/45">
                      <span className="font-medium text-amber-200">
                        {f.score}/5
                      </span>
                      <span>
                        {f.created_at
                          ? new Date(f.created_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    {f.comment && (
                      <p className="mt-2 text-sm text-white/70">{f.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-semibold text-white">
                Similar agents
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((a) => (
                  <AgentCard key={a.id || a.agent_id} agent={a} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-white/50">
            {isFeaturedThirdParty(agent.chain_id, agent.token_id) ? (
              <>
                <span className="font-semibold text-sky-300">
                  Live third-party seller
                </span>
                {" — "}
                not operated by Genesis. Buy negotiates their A2A endpoint and
                pulls their operator report. We do not write a Genesis plan
                under their name.
              </>
            ) : (
              <>
                <span className="font-semibold text-white/70">
                  Indexed agent
                </span>
                {" — "}
                ERC-8004 identity from 8004scan. If they have no live endpoint,
                Buy records that honestly — we will not impersonate them.
                Hire-ready sellers are{" "}
                <span className="text-amber-200">By Genesis</span>.
              </>
            )}
          </div>
          <HireWizard
            chainId={agent.chain_id}
            tokenId={String(agent.token_id)}
            agentName={agent.name || `Agent #${agent.token_id}`}
            categoryId={categoryId}
            hireReady={isFeaturedThirdParty(agent.chain_id, agent.token_id)}
            priceUsd={
              isFeaturedThirdParty(agent.chain_id, agent.token_id) ? 0.1 : 0
            }
            etaMinutes={1}
            x402={Boolean(agent.x402_supported)}
          />
          <a
            href={scanUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
          >
            View on 8004scan ↗
          </a>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-white/40">{label}</dt>
      <dd
        className={`text-white/85 ${mono ? "font-mono text-xs break-all sm:text-right" : "sm:text-right"}`}
      >
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
