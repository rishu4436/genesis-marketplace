import type { TrustBadge } from "@/lib/desk";

export function TrustBadges({ badges }: { badges: TrustBadge[] }) {
  const shown = badges.filter(
    (b) => b.on || b.id === "live" || b.id === "plan-certified",
  );
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((b) => {
        const offLive = !b.on && b.id === "live";
        const label = b.on
          ? b.label
          : offLive
            ? "Quote only"
            : `No ${b.label.toLowerCase()}`;
        return (
          <span
            key={b.id}
            title={b.meaning}
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
              b.on
                ? b.id === "live"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-sky-500/15 text-sky-300"
                : "bg-white/5 text-white/30"
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
