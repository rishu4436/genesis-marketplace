import Link from "next/link";
import { ScoreAxisList, ScorePentagon } from "@/components/ScorePentagon";
import { getMarketplaceDashboardSnapshot } from "@/lib/marketplace-score";

/**
 * Marketplace dashboard: partner-fed pentagon scores.
 * Always renders a chart when we have any axes (partner sample or Genesis specialists).
 */
export async function MarketplaceScorePanel() {
  const snap = await getMarketplaceDashboardSnapshot(6);
  const hasChart = snap.marketAxes.length >= 3;

  return (
    <section className="panel-strong">
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-label">Marketplace rating</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              5-axis rating
            </h2>
            <p className="body-sm mt-1.5 max-w-xl">
              Market average across sampled agents from{" "}
              {snap.partner.name}. Each listing in Browse / Categories has its
              own rating pentagon — open any agent for the full breakdown.
            </p>
          </div>
          <div className="text-right text-[11px] text-white/35">
            <div>
              Sample {snap.sampleSize}
              {snap.partner.totalAgentsIndexed != null && (
                <> · ~{snap.partner.totalAgentsIndexed.toLocaleString()} indexed</>
              )}
            </div>
            <div suppressHydrationWarning>
              Updated {new Date(snap.fetchedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {snap.error && snap.sampleSize === 0 && !hasChart ? (
        <div className="px-5 py-8 text-sm text-rose-200/90 sm:px-6">
          Could not load partner ratings: {snap.error}
        </div>
      ) : (
        <div className="grid gap-8 p-5 lg:grid-cols-[minmax(280px,320px)_1fr] lg:items-center sm:p-6">
          {/* Large market-health pentagon — always high contrast */}
          <div className="flex flex-col items-center justify-center">
            <ScorePentagon
              axes={snap.marketAxes}
              composite={snap.marketComposite}
              size={280}
              title="Market average"
              gradientId="market-avg-pent"
            />
            <p className="mt-3 text-center text-sm text-white/55">
              Rating{" "}
              <span className="font-bold text-amber-200">
                {snap.marketComposite}
              </span>{" "}
              <span className="text-white/35">/ 100</span>
            </p>
            {snap.error && (
              <p className="mt-2 max-w-[280px] text-center text-[11px] text-amber-200/70">
                Partner note: {snap.error}. Showing available sample.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/60">
              Axis breakdown
            </p>
            <div className="mt-3 max-w-md">
              <ScoreAxisList axes={snap.marketAxes} />
            </div>
            <p className="body-sm mt-4 max-w-md">
              Data source:{" "}
              <span className="text-white/55">{snap.partner.endpoint}</span>
              {snap.partner.totalFeedbacks != null && (
                <>
                  {" "}
                  · {snap.partner.totalFeedbacks.toLocaleString()} ratings
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Top scored agents with mini pentagons */}
      {snap.top.length > 0 && (
        <div className="border-t border-white/[0.06] px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/60">
              Top by Genesis rating
            </p>
            <Link
              href="/browse?sort=score"
              className="text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              Open full catalog →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snap.top.map((c, i) => (
              <Link
                key={c.agentKey}
                href={c.href}
                className="panel flex items-center gap-3 px-3 py-3 transition-colors hover:border-amber-400/30"
              >
                <ScorePentagon
                  axes={c.axes}
                  composite={c.composite}
                  size={100}
                  showLabels={false}
                  gradientId={`top-pent-${i}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {c.name}
                    </h3>
                    {c.isGenesisSpecialist && (
                      <span className="rounded-full bg-[#F0B90B] px-1.5 py-0.5 text-[9px] font-bold text-black">
                        By Genesis
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums text-white/40">
                    Rating {c.composite}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[10px] text-white/30">
                    {c.axes
                      .map((a) => `${a.short} ${Math.round(a.value)}`)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
