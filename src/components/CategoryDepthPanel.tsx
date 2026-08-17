import type { CategoryId } from "@/lib/categories";
import { getCategoryDepth } from "@/lib/category-depth";

export function CategoryDepthPanel({ categoryId }: { categoryId: CategoryId }) {
  const d = getCategoryDepth(categoryId);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="section-label">Equal depth</p>
      <h2 className="mt-1 font-display text-lg font-bold text-white">
        What buyers get in this category
      </h2>
      <p className="mt-2 text-sm text-white/55">{d.buyerPromise}</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {d.metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
          >
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              {m.label}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-white">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {d.depthBullets.map((b) => (
          <li
            key={b}
            className="flex gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-white/65"
          >
            <span className="text-emerald-400">✓</span>
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4">
        <h3 className="text-xs font-semibold text-amber-100">
          {d.sampleOutputTitle}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
          {d.sampleOutputBody}
        </p>
      </div>

      {d.pcsNote && (
        <p className="mt-4 text-[11px] leading-relaxed text-violet-200/80">
          <span className="font-semibold text-violet-200">PancakeSwap: </span>
          {d.pcsNote}
        </p>
      )}
    </section>
  );
}
