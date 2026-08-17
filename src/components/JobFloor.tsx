import Link from "next/link";
import { CategoryPreview } from "@/components/CategoryPreview";
import { getAllCategorySnapshots } from "@/lib/category-agents";
import { allGenesisAgents } from "@/lib/genesis-agents";

export async function JobFloor({
  perShelf = 3,
}: {
  perShelf?: number;
}) {
  const [shelves, specialists] = await Promise.all([
    getAllCategorySnapshots(perShelf),
    Promise.resolve(allGenesisAgents()),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Job floor</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Four jobs. Hire from here.
          </h2>
          <p className="body-sm mt-1 max-w-xl">
            Same depth on every shelf — specialist first, then hireable
            catalog. This is the marketplace, not the raw 8004scan dump.
          </p>
        </div>
        <Link href="/categories" className="text-sm font-semibold text-amber-300">
          All categories →
        </Link>
      </div>
      {shelves.map((s) => (
        <CategoryPreview
          key={s.category.id}
          category={s.category}
          agents={s.agents}
          genesis={specialists.filter((g) => g.categoryId === s.category.id)}
        />
      ))}
    </div>
  );
}
