import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgent,
  listFeedbacks,
  explorerAgentUrl,
  shortAddress,
} from "@/lib/scan";
import { matchCategory, getCategory } from "@/lib/categories";

export const revalidate = 60;

type Props = {
  params: Promise<{ chainId: string; tokenId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { chainId, tokenId } = await params;
  try {
    const res = await getAgent(Number(chainId), tokenId);
    return {
      title: res.data?.name || `Agent #${tokenId}`,
      description: res.data?.description,
    };
  } catch {
    return { title: `Agent #${tokenId}` };
  }
}

export default async function AgentDetailPage({ params }: Props) {
  const { chainId, tokenId } = await params;
  const cid = Number(chainId);
  if (!Number.isFinite(cid)) notFound();

  let agent: Awaited<ReturnType<typeof getAgent>>["data"] | null = null;
  let feedbacks: Awaited<ReturnType<typeof listFeedbacks>>["data"] = [];
  let error: string | null = null;

  try {
    const res = await getAgent(cid, tokenId);
    agent = res.data;
    try {
      const fb = await listFeedbacks({
        chainId: cid,
        tokenId,
        limit: 10,
      });
      feedbacks = fb.data || [];
    } catch {
      feedbacks = [];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Agent not found";
  }

  if (!agent && error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
          {error}
        </div>
        <Link href="/browse" className="mt-6 inline-block text-sm text-amber-300">
          ← Back to browse
        </Link>
      </div>
    );
  }

  if (!agent) notFound();

  const categoryId = matchCategory(agent.name || "", agent.description || "");
  const category = categoryId ? getCategory(categoryId) : null;
  const scanUrl = explorerAgentUrl(agent);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/browse"
        className="text-xs font-medium text-white/45 hover:text-amber-300"
      >
        ← Browse
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
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
                {agent.is_testnet ? " (testnet)" : " (mainnet)"} · Token #
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

          {/* Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
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
                    ? agent.total_score.toFixed(0)
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

          {/* Identity */}
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
                label="Payments"
                value={
                  agent.x402_supported ? "x402 supported" : "Not flagged x402"
                }
              />
            </dl>
          </section>

          {/* Feedback */}
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
        </div>

        {/* Hire panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-white/[0.03] p-5 shadow-xl shadow-amber-500/5">
            <div className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
              Hire / activate
            </div>
            <p className="mt-2 text-sm text-white/70">
              Full ERC-8183 negotiate → fund → deliver is the Week 2 goal. Today
              you can open the agent on 8004scan and prepare the hire path.
            </p>
            <Link
              href={`/hire?agent=${agent.chain_id}:${agent.token_id}`}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#F0B90B] px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Continue to hire
            </Link>
            <a
              href={scanUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              View on 8004scan ↗
            </a>
            <ul className="mt-5 space-y-2 text-xs text-white/45">
              <li>· ERC-8004 identity verified via registry index</li>
              <li>· No user fund custody on Genesis</li>
              <li>· Coming: session caps (Altana) · x402 pay</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-white/40">{label}</dt>
      <dd
        className={`text-white/85 ${mono ? "font-mono text-xs break-all sm:text-right" : "sm:text-right"}`}
      >
        {value}
      </dd>
    </div>
  );
}
