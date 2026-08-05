export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}
