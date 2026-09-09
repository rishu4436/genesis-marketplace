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
import {
  feedbackBelongsToAgent,
  formatFeedbackScore,
  formatOnchainRating,
} from "@/lib/feedback-score";
import {
  getFeaturedByToken,
  isFeaturedThirdParty,
  resolveCatalogAgent,
} from "@/lib/third-party-sellers";
import {
  hireClassForAgent,
  isHireableListing,
  matchingGenesisSlug,
} from "@/lib/hire-class";
import { hireableBscAsAgents, hireableOwnerFor } from "@/lib/hireable-bsc";
import { bscscanNftUrl } from "@/lib/proof-jobs";
import { listingPriceForAgent } from "@/lib/listing-price";

export const revalidate = 90;

type Props = {
  params: Promise<{ chainId: string; tokenId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { chainId, tokenId } = await params;
  const res = await getAgentSafe(Number(chainId), tokenId);
  const agent = resolveCatalogAgent(Number(chainId), tokenId, res.data);
  return {
    title: agent?.name || `Agent #${tokenId}`,
    description: agent?.description,
  };
}

export default async function AgentDetailPage({ params }: Props) {
  const { chainId, tokenId } = await params;
  const cid = Number(chainId);
  if (!Number.isFinite(cid)) notFound();

  const agentRes = await getAgentSafe(cid, tokenId);
  const featured = getFeaturedByToken(cid, tokenId);
  const fromHireable = hireableBscAsAgents().find(
    (a) =>
      Number(a.chain_id) === cid && String(a.token_id) === String(tokenId),
  );
  const agent =
    resolveCatalogAgent(cid, tokenId, agentRes.data) ||
    fromHireable ||
    null;

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
  const feedbacks = (fbRes.data || []).filter((f) =>
    feedbackBelongsToAgent(f, cid, tokenId),
  );

  const categoryId = matchCategory(agent.name || "", agent.description || "");
  const category = categoryId ? getCategory(categoryId) : null;
  const scanUrl = explorerAgentUrl(agent);
  const fit = rankScore(agent, categoryId || undefined);
  const axes = computeAxes(agent);
  const composite = compositeFromAxes(axes);
  const pentId = `agent-${agent.chain_id}-${String(agent.token_id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const listing = listingPriceForAgent(agent);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-6 lg:py-8 lg:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/browse"
          className="text-xs font-medium text-white/45 hover:text-amber-300"
        >
          ← Marketplace
        </Link>
        <CompareToggle agentKey={agentKey(agent)} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px] lg:grid-rows-[auto_1fr]">
        <header className="lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <AgentAvatar
              src={agent.image_url}
              name={agent.name || `Agent #${agent.token_id}`}
              size="lg"
              className="!h-14 !w-14 !rounded-2xl sm:!h-auto sm:!w-auto"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
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
                {hireClassForAgent(agent) === "indexed" && (
                  <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-200">
                    Unhireable
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
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/70 lg:line-clamp-none">
                {agent.description ||
                  "No description provided on-chain. Identity is still verifiable via ERC-8004."}
              </p>
            </div>
          </div>
        </header>
        <aside className="space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start">
          {isHireableListing(agent) ? (
            <HireWizard
              chainId={agent.chain_id}
              tokenId={String(agent.token_id)}
              agentName={agent.name || `Agent #${agent.token_id}`}
              categoryId={categoryId}
              genesisSlug={matchingGenesisSlug(agent) ?? undefined}
              ownerAddress={
                agent.owner_address ||
                hireableOwnerFor(cid, tokenId) ||
                featured?.ownerAddress ||
                undefined
              }
              hireReady={isHireableListing(agent)}
              priceUsd={listing?.amount ?? 0}
              priceLabel={
                listing?.unit === "U"
                  ? listing.label
                  : listing?.unit === "quote"
                    ? "Quote on hire"
                    : undefined
              }
              etaMinutes={1}
              x402={Boolean(agent.x402_supported)}
            />
          ) : (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-rose-200">
                Unhireable
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/50">
                This row is on-chain identity only. No live hire we can
                complete. Open a specialist for a plan you can run.
              </p>
              <Link href="/browse" className="btn-solid mt-3 inline-flex !text-sm">
                Hire a specialist
              </Link>
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-white/50 max-lg:line-clamp-2">
            {isFeaturedThirdParty(agent.chain_id, agent.token_id) ? (
              <>
                <span className="font-semibold text-sky-300">
                  Live third-party seller
                </span>
                {" — "}
                not operated by Genesis. Hire negotiates their A2A endpoint
                {featured?.restBase
                  ? " and pulls their operator report."
                  : " and returns their signed quote plus their public measured sample."}
              </>
            ) : isHireableListing(agent) ? (
              <>
                <span className="font-semibold text-sky-300">
                  Live third-party
                </span>
                {" — "}
                they have an A2A endpoint. Hire talks to them, not to us.
              </>
            ) : (
              <>
                <span className="font-semibold uppercase tracking-wide text-rose-200">
                  Unhireable
                </span>
                {" — "}
                on-chain identity only. No live hire we can complete. We
                will not impersonate them. Hire a By Genesis specialist
                instead.
              </>
            )}
          </div>
          <a
            href={bscscanNftUrl(String(agent.token_id))}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
          >
            View on BscScan ↗
          </a>
          <a
            href={scanUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/55 transition hover:bg-white/5"
          >
            8004scan index (may lag) ↗
          </a>
        </aside>
        <div className="lg:col-start-1 lg:row-start-2">
          {/* Per-agent Genesis pentagon */}
          <section
            id="score"
            className="mt-8 scroll-mt-24 rounded-2xl border border-amber-400/20 bg-white/[0.03] p-5 sm:p-6"
          >
            <p className="section-label">Hire readiness</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
              5-axis readiness
            </h2>
            <p className="body-sm mt-1.5 max-w-xl">
              Listing quality for this hire — Trust · Pay · Fit, plus Reputation
              and Reach only when 8004scan has real ratings. Unrated is not a
              low score.
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
                    { label: "Ready", value: String(Math.round(composite)) },
                    { label: "Fit", value: fit.toFixed(0) },
                    {
                      label: "Partner total",
                      value:
                        agent.total_score && agent.total_score > 0
                          ? Number(agent.total_score).toFixed(0)
                          : "—",
                    },
                    {
                      label: "On-chain rating",
                      value: formatOnchainRating(agent),
                    },
                    {
                      label: "Ratings",
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
            <h2 className="text-lg font-semibold text-white">Recent ratings</h2>
            <p className="mt-1 text-xs text-white/40">
              On-chain 8004scan scores (usually 0–100). Written comments show
              only when the rater left one.
            </p>
            {feedbacks.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">
                No ratings indexed yet.
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
                        Rating {formatFeedbackScore(f.score)}
                      </span>
                      <span>
                        {f.user_address
                          ? shortAddress(f.user_address, 4)
                          : ""}
                        {f.created_at
                          ? ` · ${new Date(f.created_at).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                    {f.comment ? (
                      <p className="mt-2 text-sm text-white/70">{f.comment}</p>
                    ) : (
                      <p className="mt-2 text-xs text-white/35">
                        Score only — no written review
                      </p>
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
