import Link from "next/link";
import { DESK, DESK_RAILS } from "@/lib/desk";
import { deskWeek } from "@/lib/desk-metrics";
import { fetchCensusAlive } from "@/lib/census-alive";
import { loadHireableBsc } from "@/lib/hireable-bsc";

export async function DeskStrip({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [week, census] = await Promise.all([deskWeek(), fetchCensusAlive()]);

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
          : "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
        Smart Money desk
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-white/70">
        {DESK.loop}
      </p>
      <p className="mt-1 text-[11px] text-white/40">{DESK.northStar}</p>
      {census.stats.alive > 0 && (
        <p className="mt-1 text-[11px] text-white/45">
          BSC register {census.stats.registered.toLocaleString()} ·{" "}
          <span className="text-lime-200/90">
            {census.stats.alive.toLocaleString()} endpoint-alive
          </span>
          {" · "}
          {(() => {
            const h = loadHireableBsc().byCategory;
            return `hireable A2A · rebalance ${h.rebalancing} · grid ${h["grid-trading"]} · yield ${h["yield-optimisation"]} · health ${h["health-factor"]}`;
          })()}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/70">
            {DESK_RAILS.L0.short} plans / 7d
          </p>
          <p className="mt-0.5 font-display text-lg text-white">
            {week.l0PlansDelivered}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
            {DESK_RAILS.L2.short} escrowed+paid / 7d
          </p>
          <p className="mt-0.5 font-display text-lg text-white">
            {week.l2EscrowedPaid}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
            Unique payers / 7d
          </p>
          <p className="mt-0.5 font-display text-lg text-white">
            {week.uniquePayers}
          </p>
        </div>
        <Link
          href="/fund"
          className="flex flex-col justify-center rounded-xl border border-white/10 px-3 py-2 text-[11px] text-white/55 hover:border-amber-400/30 hover:text-amber-100"
        >
          <span className="font-semibold text-white/80">L2 rail</span>
          Optional ERC-8183 on /fund
        </Link>
      </div>
    </section>
  );
}
