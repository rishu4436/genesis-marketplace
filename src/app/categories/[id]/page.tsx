import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { getCategory, CATEGORIES, type CategoryId } from "@/lib/categories";
import { getAgentsForCategory } from "@/lib/category-agents";

export const revalidate = 60;

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

  let agents: Awaited<ReturnType<typeof getAgentsForCategory>> = [];
  let error: string | null = null;

  try {
    agents = await getAgentsForCategory(id as CategoryId, 15);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load agents";
  }

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
        <Link
          href={`/browse?q=${encodeURIComponent(cat.searchQueries[0])}`}
          className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          Open in search
        </Link>
      </div>

      {error && (
        <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Agents in this category
        </h2>
        <span className="text-xs text-white/40">
          {agents.length} shown · semantic match via 8004scan
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <AgentCard key={a.id || a.agent_id} agent={a} />
        ))}
      </div>

      {!error && agents.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-sm text-white/55">
            No strong matches yet. Next: seed Genesis-verified agents for this
            category via BNB Agent Studio.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-block text-sm font-medium text-amber-300"
          >
            Browse all BSC agents →
          </Link>
        </div>
      )}
    </div>
  );
}
