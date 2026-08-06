import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { GenesisAgentCard } from "@/components/GenesisAgentCard";
import { getCategory, CATEGORIES, type CategoryId } from "@/lib/categories";
import { getAgentsForCategory } from "@/lib/category-agents";
import { getGenesisAgentsByCategory } from "@/lib/genesis-agents";

export const revalidate = 90;

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const cat = getCategory(id);
  return {
    title: cat ? cat.name : "Category",
    description: cat?.description,
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { id } = await params;
  const cat = getCategory(id);
  if (!cat) notFound();

  const genesis = getGenesisAgentsByCategory(id as CategoryId);
  const { agents, source, error } = await getAgentsForCategory(
    id as CategoryId,
    18,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/categories"
        className="text-xs font-medium text-white/45 hover:text-amber-300"
      >
        ← All categories
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.accent} text-xl font-bold text-black/80`}
          >
            {cat.icon}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {cat.name}
          </h1>
          <p className="mt-2 text-sm text-white/55">{cat.description}</p>
          <p className="mt-3 text-xs text-white/40">
            <span className="font-medium text-white/60">Agent role: </span>
            {cat.agentDoes}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={`/browse?q=${encodeURIComponent(cat.searchQueries[0])}`}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Open in search
          </Link>
          <span className="text-[10px] uppercase tracking-wider text-white/30">
            source · {source}
          </span>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          Genesis verified
        </h2>
        <p className="mt-1 text-xs text-white/45">
          Hire end-to-end in the product — equal depth for this category.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {genesis.map((a) => (
            <GenesisAgentCard key={a.slug} agent={a} />
          ))}
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          More from BSC index
        </h2>
        <span className="text-xs text-white/40">
          {agents.length} listed · {source}
        </span>
      </div>

      {agents.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <AgentCard
              key={a.id || a.agent_id}
              agent={a}
              categoryId={cat.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No index matches right now"
            body={
              error ||
              "8004scan returned no keyword matches. Genesis verified seller above is still hireable."
            }
            actionHref="/browse"
            actionLabel="Browse all agents"
          />
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-white">
          What great looks like in this category
        </h3>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-white/50">
          <li>Clear job description (not generic “AI agent”)</li>
          <li>On-chain identity + optional x402 payment support</li>
          <li>Feedback or score so hirers can compare</li>
          <li>Safe posture: no custody of user funds on Genesis</li>
        </ul>
      </div>
    </div>
  );
}
