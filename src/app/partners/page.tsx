import Link from "next/link";
import { MarketplaceScorePanel } from "@/components/MarketplaceScorePanel";
import { probePartners } from "@/lib/partner-status";
import type { PartnerMode } from "@/lib/partner-status";

export const metadata = {
  title: "Partners",
  description:
    "Live status for 8004scan, Altana, TermiX, PancakeSwap, and the featured third-party seller.",
};

export const dynamic = "force-dynamic";

function modeLabel(mode: PartnerMode, ok: boolean) {
  if (!ok || mode === "down") return "Down";
  if (mode === "live") return "Live";
  if (mode === "proof") return "On-chain proof";
  return "In-product";
}

function modeClass(mode: PartnerMode, ok: boolean) {
  if (!ok || mode === "down") return "bg-rose-400/15 text-rose-200";
  if (mode === "live") return "bg-emerald-400/15 text-emerald-200";
  if (mode === "proof") return "bg-violet-400/15 text-violet-200";
  return "bg-amber-400/15 text-amber-100";
}

export default async function PartnersPage() {
  const snap = await probePartners();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Partners</p>
      <h1 className="display-section mt-3 text-white">On the hire floor</h1>
      <p className="lead mt-4 max-w-2xl">
        These integrations feed catalog, ratings, live ticks, session keys, and
        advantage proof. They are not a slide — each one has a probe and a
        product surface.
      </p>
      <p className="mt-3 text-[12px] text-white/40">
        {snap.liveCount}/{snap.total} answering · updated{" "}
        {new Date(snap.fetchedAt).toLocaleString()}
      </p>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {snap.partners.map((p) => (
          <article
            key={p.id}
            id={p.id}
            className="scroll-mt-28 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {p.track}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-white">
                  {p.name}
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${modeClass(p.mode, p.ok)}`}
              >
                {modeLabel(p.mode, p.ok)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              {p.detail}
            </p>
            {p.metric && (
              <p className="mt-1 font-mono text-[12px] text-amber-200/80">
                {p.metric}
                {p.ms != null ? ` · ${p.ms}ms` : ""}
              </p>
            )}
            {!p.metric && p.ms != null && (
              <p className="mt-1 font-mono text-[12px] text-white/35">
                probe {p.ms}ms
              </p>
            )}
            <ul className="mt-4 space-y-1 text-[13px] text-white/55">
              {p.powers.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={p.href} className="btn-line !h-9 !text-xs">
                Open
              </Link>
              {p.docs && (
                <Link
                  href={p.docs}
                  target={p.docs.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="btn-line !h-9 !text-xs"
                >
                  Docs
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      <div id="score" className="mt-14 scroll-mt-28">
        <MarketplaceScorePanel />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/hire" className="btn-solid">
          Hire an agent
        </Link>
        <Link href="/judge" className="btn-line">
          Judge path
        </Link>
      </div>
    </div>
  );
}
