import Link from "next/link";
import type { Category } from "@/lib/categories";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.id}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${category.accent} text-lg font-bold text-black/80 shadow-lg`}
      >
        {category.icon}
      </div>
      <h3 className="text-base font-semibold text-white group-hover:text-amber-200">
        {category.name}
      </h3>
      <p className="mt-1 text-xs font-medium text-white/45">{category.tagline}</p>
      <p className="mt-3 text-xs leading-relaxed text-white/55">
        {category.agentDoes}
      </p>
      <div className="mt-4 text-xs font-semibold text-amber-300">
        Browse agents →
      </div>
    </Link>
  );
}
