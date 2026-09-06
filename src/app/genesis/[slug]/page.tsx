import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGenesisAgent,
  GENESIS_AGENTS,
  allGenesisAgents,
  genesisToAgentCard,
} from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";
import { HireWizard } from "@/components/HireWizard";
import { GenesisAgentCard } from "@/components/GenesisAgentCard";
import { ScoreAxisList, ScorePentagon } from "@/components/ScorePentagon";
import { TrustPassport } from "@/components/TrustPassport";
import { AgentLiveBadge } from "@/components/AgentLiveBadge";
import { CategoryDepthPanel } from "@/components/CategoryDepthPanel";
import { getPin } from "@/lib/pins";
import { BRAND } from "@/lib/brand";
import { getCategoryDepth } from "@/lib/category-depth";
import { taskFitForGenesis } from "@/lib/task-fit";
import { TaskFitBadge } from "@/components/TaskFitBadge";
import { SoftHireNote } from "@/components/SoftHireNote";
import { AltanaPanel } from "@/components/AltanaPanel";
import { SellerIdentityPanel } from "@/components/SellerIdentityPanel";
import { AdmissionPanel } from "@/components/AdmissionPanel";
import { ReceiptScorePanel } from "@/components/ReceiptScorePanel";
import { admitSeller } from "@/lib/admission";
import { scoreAllSpecialists } from "@/lib/receipt-score";
import { defaultTaskForCategory } from "@/lib/hire";
import { checkAgentHealth } from "@/lib/agent-health";
import {
  compositeFromAxes,
  computeAxes,
} from "@/lib/marketplace-score";

export const dynamic = "force-dynamic";

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
    title: agent
      ? `${agent.name} · ${BRAND.byBadge}`
      : BRAND.specialistLabel,
    description: agent?.description,
  };
}

export default async function GenesisAgentPage({ params }: Props) {
  const { slug } = await params;
  const agent = getGenesisAgent(slug);
  if (!agent) notFound();

  const cat = getCategory(agent.categoryId);
  const others = allGenesisAgents().filter((a) => a.slug !== agent.slug);
  const pin = getPin(agent.slug);

  const defaultTask = defaultTaskForCategory(agent.categoryId);
  const fit = taskFitForGenesis(agent, defaultTask);
  const health = await checkAgentHealth(agent);
  const admission = admitSeller(agent);
  const allScores = await scoreAllSpecialists();
  const receiptScore = allScores.find((s) => s.slug === agent.slug) ?? null;
  const fitBySlug = Object.fromEntries(
    allScores.map((s) => [s.slug, s.composite]),
  );
  const card = genesisToAgentCard(agent, {
    receiptFit: receiptScore?.composite,
  });
  const axes = computeAxes(card).map((ax) => {
    if (ax.id === "commerce") {
      return {
        ...ax,
        value: Math.min(100, ax.value + 15),
        source: "marketplace specialist · hire-ready · no x402 ping yet",
      };
    }
    if (ax.id === "trust") {
      return {
        ...ax,
        value: Math.min(100, ax.value + 20),
        source: "operated by Genesis",
      };
    }
    if (ax.id === "fitness" && receiptScore) {
      return {
        ...ax,
        value: receiptScore.composite,
        source: `receipt composite · n=${receiptScore.sampleSize}`,
      };
    }
    return ax;
  });
  const composite = compositeFromAxes(axes);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href={`/categories/${agent.categoryId}`}
        className="text-xs font-medium text-white/45 hover:text-amber-300"
      >
        ← {cat?.name || "Category"}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <aside className="order-1 space-y-3 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-50/90">
            <span className="font-bold text-[#F0B90B]">Hire-ready</span>
            {" — "}
            {BRAND.byBadge} seller we operate. Hire returns a structured
            plan in about {agent.etaMinutes}m.
          </div>
          <SoftHireNote compact />
          <TaskFitBadge fit={fit} />
          <HireWizard
            chainId={agent.chainId ?? 56}
            tokenId={agent.tokenId || `genesis:${agent.slug}`}
            agentName={agent.name}
            categoryId={agent.categoryId}
            genesisSlug={agent.slug}
            hireReady
            priceUsd={agent.basePriceUsd}
            etaMinutes={agent.etaMinutes}
            x402={agent.x402}
          />
          <AltanaPanel defaultAgent={agent.slug} compact />
        </aside>
        <div className="order-2 lg:order-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.accent} text-3xl font-bold text-black/80`}
            >
              {agent.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-white">
                  {agent.name}
                </h1>
                <span className="rounded-full bg-[#F0B90B] px-2.5 py-0.5 text-[11px] font-bold text-black">
                  {BRAND.byBadge}
                </span>
                <AgentLiveBadge slug={agent.slug} initial={health} />
                {pin.tokenId && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/60">
                    Token #{pin.tokenId}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium text-white/50">
                {BRAND.specialistLabel} · built & operated by {BRAND.name}
              </p>
              <p className="mt-1 text-sm text-amber-100/80">{agent.tagline}</p>
              <p className="body mt-3 max-w-2xl">{agent.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a href="#buy" className="btn-solid !px-4 !text-sm">
                  Hire · ${agent.basePriceUsd}
                </a>
                <span className="text-xs text-white/45">
                  ~{agent.etaMinutes}m · plan only · you keep the keys
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <CategoryDepthPanel categoryId={agent.categoryId} />
          </div>

          {receiptScore && <ReceiptScorePanel score={receiptScore} />}

          <section
            id="score"
            className="mt-8 scroll-mt-24 rounded-2xl border border-amber-400/20 bg-white/[0.03] p-5 sm:p-6"
          >
            <p className="section-label">Index readiness</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
              8004scan labels
            </h2>
            <p className="body-sm mt-1.5 max-w-xl">
              Partner-index signals (stars, reach, x402). These are labels,
              not the receipt score above. Unrated is not a low score. The
              index may lag new mints — BscScan is the on-chain NFT proof.
            </p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(260px,300px)_1fr] lg:items-center">
              <div className="flex flex-col items-center">
                <ScorePentagon
                  axes={axes}
                  composite={composite}
                  size={260}
                  title={agent.name}
                  gradientId={`genesis-detail-${agent.slug}`}
                />
              </div>
              <div className="max-w-md">
                <ScoreAxisList axes={axes} />
              </div>
            </div>
          </section>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "From", value: `$${agent.basePriceUsd}` },
              { label: "ETA", value: `~${agent.etaMinutes}m` },
              {
                label: "Ready",
                value: String(Math.round(composite)),
              },
              { label: "On-chain rating", value: "Unrated" },
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

          <div className="mt-10">
            <SellerIdentityPanel health={health} />
            <AdmissionPanel report={admission} />

            <TrustPassport
              registered={health.checks.identity.ok}
              registrationDetail={
                health.identity.erc8004
                  ? `ERC-8004 #${health.identity.tokenId} · BSC mainnet · ${health.version} · ${health.label}.`
                  : `BSC mainnet · controller bound · ERC-8004 token pending · ${health.version}.`
              }
              features={[
                {
                  label: "By Genesis specialist",
                  detail: "Operated + pinned by Genesis",
                  active: true,
                },
                {
                  label: "Hire runtime",
                  detail: health.detail,
                  active: health.hireable,
                },
                {
                  label: "x402 payments",
                  detail: agent.x402 ? "Listed" : "Not listed",
                  active: agent.x402,
                },
                {
                  label: "Protocols",
                  detail: agent.protocols.join(", "),
                  active: agent.protocols.length > 0,
                },
                {
                  label: "PancakeSwap-aware",
                  detail: agent.pcsRelated
                    ? "LP / farm / pool context"
                    : "Not PCS-specific",
                  active: agent.pcsRelated,
                },
                {
                  label: "Service endpoint",
                  detail: agent.serviceUrl || pin.serviceUrl || "Marketplace path",
                  active: Boolean(agent.serviceUrl || pin.serviceUrl),
                },
              ]}
              skills={agent.skills}
              samplePreview={{
                title: getCategoryDepth(agent.categoryId).sampleOutputTitle,
                body: getCategoryDepth(agent.categoryId).sampleOutputBody,
              }}
            />
          </div>

          {others.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-semibold text-white">
                More specialists by {BRAND.name}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {others.map((a) => (
                  <GenesisAgentCard
                    key={a.slug}
                    agent={a}
                    receiptFit={fitBySlug[a.slug]}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
