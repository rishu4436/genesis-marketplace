import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGenesisAgent,
  GENESIS_AGENTS,
  allGenesisAgents,
} from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { HireWizard } from "@/components/HireWizard";
import { GenesisAgentCard } from "@/components/GenesisAgentCard";
import { getPlatformConfig } from "@/lib/platform-a2a";
import { getPin } from "@/lib/pins";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return GENESIS_AGENTS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const agent = getGenesisAgent(slug);
  return {
    title: agent ? `${agent.name} · Genesis verified` : "Genesis agent",
    description: agent?.description,
  };
}

export default async function GenesisAgentPage({ params }: Props) {
  const { slug } = await params;
  const agent = getGenesisAgent(slug);
  if (!agent) notFound();

  const cat = getCategory(agent.categoryId);
  const others = allGenesisAgents().filter((a) => a.slug !== agent.slug);
  const platform = getPlatformConfig(agent.slug);
  const pin = getPin(agent.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href={`/categories/${agent.categoryId}`}
        className="text-xs font-medium text-white/45 hover:text-amber-300"
      >
        ← {cat?.name || "Category"}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.accent} text-3xl font-bold text-black/80`}
            >
              {agent.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {agent.name}
                </h1>
                <span className="rounded-full bg-[#F0B90B] px-2.5 py-0.5 text-[11px] font-bold text-black">
                  Genesis verified
                </span>
                {platform ? (
                  <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[11px] font-medium text-sky-200">
                    Platform live · ERC-8004
                    {pin.tokenId ? ` #${pin.tokenId}` : ""}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/60">
                    Local APEX hire
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-amber-100/80">{agent.tagline}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {agent.description}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "From", value: `$${agent.basePriceUsd}` },
              { label: "ETA", value: `~${agent.etaMinutes}m` },
              { label: "Category", value: cat?.shortName || "—" },
              {
                label: "On-chain pin",
                value: agent.tokenId
                  ? `${agent.chainId}:${agent.tokenId}`
                  : "Pending Studio",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  {m.label}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">Skills</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {agent.skills.map((s) => (
                <li
                  key={s}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70"
                >
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              APEX service
            </h2>
            <p className="mt-2 break-all font-mono text-[11px] text-amber-200/90">
              {agent.serviceUrl || "—"}
            </p>
            <p className="mt-1 text-[10px] text-white/40">
              Hire uses POST …/negotiate (Studio Layer B shape). External URL via
              config/pins.json after bag deploy.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">Why hire</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>· Built for the {cat?.name} marketplace shelf (equal depth)</li>
              <li>· Full hire path: negotiate → quote → deliver in-product</li>
              <li>· No user fund custody — plans and simulations only</li>
              {agent.pcsRelated && (
                <li>· PancakeSwap-aware (LP / farm / pool context)</li>
              )}
              <li>· x402 + ERC-8183 shaped for Agent Studio sellers</li>
            </ul>
          </section>

          {others.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-semibold text-white">
                Other Genesis agents
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {others.map((a) => (
                  <GenesisAgentCard key={a.slug} agent={a} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <HireWizard
            chainId={agent.chainId ?? 56}
            tokenId={agent.tokenId || `genesis:${agent.slug}`}
            agentName={agent.name}
            categoryId={agent.categoryId}
            genesisSlug={agent.slug}
          />
        </aside>
      </div>
    </div>
  );
}
