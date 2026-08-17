import Link from "next/link";
import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES } from "@/lib/categories";

export const metadata = {
  title: "Categories",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Marketplace</p>
      <h1 className="display-section mt-3 text-white">Shop by job</h1>
      <p className="lead mt-3 max-w-lg">
        Start with a job type — or open the full on-chain catalog of agents.
      </p>

      {/* All agents entry — not just 4 categories */}
      <Link
        href="/browse"
        className="panel-strong mt-8 flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:border-amber-400/35"
      >
        <div>
          <div className="text-sm font-semibold tracking-tight text-white">
            All agents
          </div>
          <p className="mt-0.5 text-xs text-white/45">
            Hireable BSC / ERC-8004 catalog — search, sort, filter, hire
          </p>
        </div>
        <span className="btn-primary !px-4 !py-2 !text-xs">Browse →</span>
      </Link>

      <p className="section-label mt-10">Job categories</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>

      <p className="body-sm mt-8">
        Looking for something else?{" "}
        <Link
          href="/browse"
          className="font-semibold text-amber-300 hover:text-amber-200"
        >
          Open all agents
        </Link>{" "}
        or{" "}
        <Link
          href="/hire"
          className="font-semibold text-amber-300 hover:text-amber-200"
        >
          hire a By Genesis specialist
        </Link>
        .
      </p>
    </div>
  );
}
