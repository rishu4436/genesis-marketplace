export function StatPill({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.06]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-white sm:text-xl">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-white/35">{hint}</div>
      )}
    </div>
  );
}
