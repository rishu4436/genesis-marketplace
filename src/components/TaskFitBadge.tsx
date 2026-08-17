import type { TaskFitResult } from "@/lib/task-fit";

export function TaskFitBadge({ fit }: { fit: TaskFitResult }) {
  const tone =
    fit.score >= 85
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : fit.score >= 70
        ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
        : "border-white/15 bg-white/5 text-white/60";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          Task fit
        </span>
        <span className="text-lg font-bold tabular-nums">{fit.score}</span>
      </div>
      <p className="mt-1 text-xs font-semibold">{fit.label}</p>
      <ul className="mt-2 space-y-0.5 text-[11px] opacity-80">
        {fit.reasons.map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>
    </div>
  );
}
