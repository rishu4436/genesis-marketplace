import Link from "next/link";
import type { Category } from "@/lib/categories";
import type { Agent } from "@/lib/types";
import type { GenesisAgent } from "@/lib/genesis-agents";
import { AgentCard } from "@/components/AgentCard";
import { GenesisAgentCard } from "@/components/GenesisAgentCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { isHireableListing } from "@/lib/hire-class";

export function CategoryPreview({
  category,
  agents,
  genesis,
  receiptFitBySlug,
}: {
  category: Category;
  agents: Agent[];
  genesis?: GenesisAgent[];
  receiptFitBySlug?: Record<string, number>;
}) {
  const g = genesis?.[0];
  const hireable = agents.filter(isHireableListing);

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CategoryIcon id={category.id} size="sm" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-white">
              {category.name}
            </h3>
            <p className="text-xs text-white/45">{category.tagline}</p>
          </div>
        </div>
        <Link
          href={`/categories/${category.id}`}
          className="text-xs font-semibold text-amber-300 hover:text-amber-200"
        >
          View category →
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {g && (
          <GenesisAgentCard
            agent={g}
            receiptFit={receiptFitBySlug?.[g.slug]}
          />
        )}
        {hireable.slice(0, g ? 3 : 4).map((a) => (
          <AgentCard
            key={a.id || a.agent_id}
            agent={a}
            categoryId={category.id}
          />
        ))}
      </div>
      {!g && hireable.length === 0 && (
        <p className="mt-4 text-xs text-white/40">
          No agents loaded for this shelf yet.
        </p>
      )}
    </section>
  );
}
