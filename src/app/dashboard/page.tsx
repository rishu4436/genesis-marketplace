import Link from "next/link";
import { Suspense } from "react";
import { HireDashboard } from "@/components/HireDashboard";
import { MarketplaceScorePanel } from "@/components/MarketplaceScorePanel";
import { OutcomesPanel } from "@/components/OutcomesPanel";

export const metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

function ScorePanelFallback() {
  return (
    <div className="panel-strong px-5 py-12 text-center sm:px-6">
      <p className="text-sm text-white/45">Loading marketplace ratings…</p>
      <p className="mt-1 text-xs text-white/30">
        Fetching partner index (timeout 8s)
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-label">Dashboard</p>
          <h1 className="display-section mt-3 text-white">Marketplace hub</h1>
          <p className="lead mt-4 max-w-xl">
            Market-wide rating pentagon from the partner index. Every agent card
            in Browse and Categories shows its own 5-axis rating.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/packages" className="btn-secondary !py-2.5 !text-sm">
            Packages
          </Link>
          <Link href="/hire" className="btn-primary !py-2.5 !text-sm">
            Buy an agent
          </Link>
        </div>
      </div>

      <div id="outcomes" className="mt-10 scroll-mt-24">
        <p className="section-label">Outcomes ledger</p>
        <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-white">
          Marketplace-proven jobs
        </h2>
        <p className="body-sm mt-1.5 max-w-xl">
          Durable server records from buys on this instance — success rate and
          agent performance beyond raw index ratings.
        </p>
        <div className="mt-5">
          <OutcomesPanel />
        </div>
      </div>

      {/* Scores load in Suspense so My hires still works if partner is slow. */}
      <div id="pentagon" className="mt-12 scroll-mt-24">
        <Suspense fallback={<ScorePanelFallback />}>
          <MarketplaceScorePanel />
        </Suspense>
      </div>

      <div className="mt-12">
        <p className="section-label">My hires</p>
        <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-white">
          Jobs from this browser
        </h2>
        <div className="mt-5">
          <HireDashboard />
        </div>
      </div>
    </div>
  );
}
