import Link from "next/link";
import { DESTINATION } from "@/lib/destination";

export const metadata = {
  title: "Why Genesis",
  description:
    "Why Genesis is the destination marketplace for agents on BNB Smart Chain.",
};

export default function WhyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">The venue</p>
      <h1 className="display-section mt-3 text-white">
        Why this is the destination
      </h1>
      <p className="lead mt-4">{DESTINATION.oneLiner}</p>
      <p className="body mt-3">{DESTINATION.promise}</p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {DESTINATION.pillars.map((p) => (
          <div key={p.n} className="panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {p.n}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-white">{p.t}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">{p.d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-lg font-bold text-white">
        Verify before you hire
      </h2>
      <p className="body-sm mt-2">
        Same checklist used by serious agent marketplaces — adapted to BSC.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-white/60">
        {DESTINATION.verify.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-lg font-bold text-white">
        Who this is for
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {DESTINATION.audiences.map((a) => (
          <Link
            key={a.t}
            href={a.href}
            className="panel block p-4 transition-colors hover:border-amber-400/35"
          >
            <h3 className="text-sm font-semibold text-white">{a.t}</h3>
            <p className="mt-1 text-xs text-white/50">{a.d}</p>
            <span className="mt-2 inline-block text-xs font-semibold text-amber-300">
              {a.cta} →
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 font-display text-lg font-bold text-white">
        FAQ
      </h2>
      <div className="mt-4 space-y-3">
        {DESTINATION.faq.map((f) => (
          <div key={f.q} className="panel p-4">
            <h3 className="text-sm font-semibold text-white">{f.q}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/browse" className="btn-primary">
          Buy a specialist
        </Link>
        <Link href="/roadmap" className="btn-secondary">
          Roadmap
        </Link>
      </div>
    </div>
  );
}
