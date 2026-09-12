import Link from "next/link";
import { DESK } from "@/lib/desk";
import { deskWeek } from "@/lib/desk-metrics";
import { getHireTally } from "@/lib/hire-tally";

export async function DeskStrip({
  compact = false,
  hideCensus = false,
}: {
  compact?: boolean;
  hideCensus?: boolean;
}) {
  const [week, tally] = await Promise.all([
    deskWeek(),
    hideCensus ? Promise.resolve(null) : getHireTally(),
  ]);

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
      {!hideCensus && tally && tally.endpointAlive > 0 && (
        <p className="mt-1 text-[11px] text-white/45">
          {(() => {
            return (
              <>
                <span className="text-amber-100">
                  {tally.hireable.toLocaleString("en-US")} on the desk
                </span>
                {" · "}
                <span className="text-lime-200/80">
                  {tally.aliveNotHireable.toLocaleString("en-US")} alive, not a hire
                </span>
                {" · "}
                <span className="text-rose-200/70">
                  {tally.registered.toLocaleString("en-US")} registered, not
                  a hire
                </span>
              </>
            );
          })()}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/70">
            Plans / 7d
          </p>
          <p className="mt-0.5 font-display text-lg text-white">
            {week.l0PlansDelivered}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
            Escrow funded / 7d
          </p>
          <p className="mt-0.5 font-display text-lg text-white">
            {week.l2EscrowFunded}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
            Settled / 7d
          </p>
          <p className="mt-0.5 font-display text-lg text-white">
            {week.l2EscrowedPaid}
          </p>
        </div>
        <Link
          href="/genesis/range-keeper?escrow=1#buy"
          className="flex flex-col justify-center rounded-xl border border-white/10 px-3 py-2 text-[11px] text-white/55 hover:border-amber-400/30 hover:text-amber-100"
        >
          <span className="font-semibold text-white/80">Escrow</span>
          Optional ERC-8183 on RangeKeeper
        </Link>
      </div>
    </section>
  );
}
