import Link from "next/link";
import { probePartners } from "@/lib/partner-status";
import type { PartnerMode } from "@/lib/partner-status";

function modeDot(mode: PartnerMode, ok: boolean) {
  if (!ok || mode === "down") return "bg-rose-400";
  if (mode === "live") return "bg-emerald-400";
  if (mode === "proof") return "bg-violet-400";
  return "bg-amber-300";
}

export async function PartnerStatusStrip({
  compact = false,
}: {
  compact?: boolean;
}) {
  const snap = await probePartners();

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
          : "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Partners · {snap.liveCount}/{snap.total} answering
        </p>
        <Link
          href="/partners"
          className="text-[11px] font-semibold text-amber-300 hover:text-amber-200"
        >
          Open partner hub →
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {snap.partners.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            title={p.detail}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-white/70 hover:border-amber-400/30 hover:text-amber-100"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${modeDot(p.mode, p.ok)}`}
            />
            <span>{p.name}</span>
            {p.metric && (
              <span className="hidden text-white/35 sm:inline">{p.metric}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
