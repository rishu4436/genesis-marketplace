import Link from "next/link";
import type { Category } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";

/** Compact category row/card — icon matches job type, not oversized. */
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.id}`}
      className="group panel flex items-center gap-3.5 px-3.5 py-3 transition-colors hover:border-white/16 hover:bg-white/[0.045]"
    >
      <CategoryIcon id={category.id} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold tracking-tight text-white group-hover:text-amber-50">
            {category.name}
          </h3>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/45">
          {category.tagline}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-amber-300/80 transition group-hover:translate-x-0.5 group-hover:text-amber-300">
        →
      </span>
    </Link>
  );
}
