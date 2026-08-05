import Link from "next/link";
import type { Category } from "@/lib/categories";
import type { Agent } from "@/lib/types";
import { AgentCard } from "@/components/AgentCard";

export function CategoryPreview({
  category,
  agents,
}: {
  category: Category;
  agents: Agent[];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${category.accent} text-base font-bold text-black/80`}
          >
            {category.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {category.name}
            </h3>
            <p className="mt-0.5 text-xs text-white/45">{category.tagline}</p>
          </div>
        </div>
        <Link
          href={`/categories/${category.id}`}
          className="text-xs font-semibold text-amber-300 hover:text-amber-200"
        >
          View category →
        </Link>
      </div>
      {agents.length === 0 ? (
        <p className="mt-6 text-xs text-white/40">
          Loading agents for this category… If empty, API rate limits may apply.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {agents.slice(0, 4).map((a) => (
            <AgentCard
              key={a.id || a.agent_id}
              agent={a}
              categoryId={category.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
