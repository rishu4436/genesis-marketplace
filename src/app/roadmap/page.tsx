import Link from "next/link";
import {
  ROADMAP_NEVER,
  ROADMAP_NORTH_STAR,
  ROADMAP_ORDER,
  ROADMAP_PHASES,
  ROADMAP_RULES,
  type RoadmapPhaseStatus,
} from "@/lib/product-roadmap";

export const metadata = {
  title: "Roadmap",
  description:
    "Phase plan for Genesis Marketplace — plan first, optional escrow, rank from settled jobs.",
};

const STATUS_LABEL: Record<RoadmapPhaseStatus, string> = {
  now: "Now",
  "in-progress": "In progress",
  next: "Next",
  later: "Later",
  done: "Done",
};

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Product</p>
      <h1 className="display-section mt-3 text-white">Roadmap</h1>
      <p className="lead mt-4">
        Phases, in order. Each one has a goal, what ships, what we refuse, and
        what done looks like.
      </p>
      <p className="mt-4 text-[14px] leading-relaxed text-white/50">
        North star: {ROADMAP_NORTH_STAR}
      </p>

      <ul className="mt-6 space-y-2 text-[13px] leading-relaxed text-white/50">
        {ROADMAP_RULES.map((r) => (
          <li
            key={r}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
          >
            {r}
          </li>
        ))}
      </ul>

      <ol className="mt-8 space-y-2 font-mono text-[12px] leading-relaxed text-white/40">
        {ROADMAP_ORDER.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>

      <div className="mt-12 space-y-6">
        {ROADMAP_PHASES.map((phase) => {
          const active =
            phase.status === "now" || phase.status === "in-progress";
          return (
            <article
              key={phase.id}
              className={`rounded-2xl border px-5 py-5 sm:px-6 ${
                active
                  ? "border-amber-400/40 bg-amber-400/[0.06]"
                  : "border-white/[0.08] bg-white/[0.03]"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-white">
                  <span className="text-white/35">Phase {phase.n}</span>
                  {" · "}
                  {phase.title}
                </h2>
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                    active ? "text-amber-200" : "text-white/35"
                  }`}
                >
                  {STATUS_LABEL[phase.status]}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-white/70">
                {phase.goal}
              </p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Ship
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/55">
                {phase.ship.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Will not
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/40">
                {phase.hold.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] leading-relaxed text-white/45">
                <span className="font-semibold text-white/60">Done when. </span>
                {phase.exit}
              </p>
            </article>
          );
        })}
      </div>

      <section className="mt-14">
        <h2 className="font-display text-lg font-bold text-white">
          What we will not do
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-white/50">
          {ROADMAP_NEVER.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/browse" className="btn-primary">
          Browse
        </Link>
      </div>
    </div>
  );
}
