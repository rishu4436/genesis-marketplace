import Link from "next/link";
import { CategoryPreview } from "@/components/CategoryPreview";
import { CATEGORIES } from "@/lib/categories";
import { getGenesisAgentsByCategory } from "@/lib/genesis-agents";
import { deskFloorForCategory } from "@/lib/desk-floor";

export function JobFloor({
  perShelf = 8,
}: {
  perShelf?: number;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Job floor</p>
          <h2 className="mt-2 font-display text-xl font-bold text-white">
            Four jobs. Hire from here.
          </h2>
          <p className="body-sm mt-1 hidden max-w-xl sm:block">
            Same depth on every shelf — specialist first, then live
            hireable listings. Unhireable identities stay on category
            pages and Index.
          </p>
        </div>
        <Link href="/categories" className="hidden text-sm font-semibold text-amber-300 sm:inline">
          All categories →
        </Link>
      </div>
      {CATEGORIES.map((cat) => (
        <CategoryPreview
          key={cat.id}
          category={cat}
          genesis={getGenesisAgentsByCategory(cat.id)}
          agents={deskFloorForCategory(cat.id).slice(0, perShelf)}
          maxLive={perShelf}
        />
      ))}
    </div>
  );
}
