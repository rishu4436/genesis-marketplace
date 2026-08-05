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
import { CompareToggle } from "@/components/CompareTray";
import { rankScore } from "@/lib/agent-rank";

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
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/10">
              {agent.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-amber-300">
                  ◆
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {agent.name || `Agent #${agent.token_id}`}
              </h1>
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
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                label: "Fit score",
                value: fit.toFixed(0),
              },
              {
                label: "Avg score",
                value:
                  agent.average_score && agent.average_score > 0
                    ? agent.average_score.toFixed(2)
                    : "—",
              },
              {
                label: "Feedbacks",
                value: agent.total_feedbacks ?? 0,
              },
              {
                label: "Stars",
                value: agent.star_count ?? 0,
              },
              {
                label: "Total score",
                value:
                  agent.total_score && agent.total_score > 0
                    ? Number(agent.total_score).toFixed(0)
                    : "—",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  {m.label}
                </div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">
              Why hire this agent
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                agent.x402_supported
                  ? "Supports x402 payments"
                  : "Payment rails not flagged (x402)",
                agent.is_verified
                  ? "Marked verified in index"
                  : "Unverified — inspect owner & feedback",
                (agent.total_feedbacks ?? 0) > 0
                  ? `${agent.total_feedbacks} feedback signals on record`
                  : "No feedback yet — early / unproven",
                category
                  ? `Mapped to ${category.name}`
                  : "General-purpose listing",
              ].map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>

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
          <HireWizard
            chainId={agent.chain_id}
            tokenId={String(agent.token_id)}
            agentName={agent.name || `Agent #${agent.token_id}`}
            categoryId={categoryId}
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
