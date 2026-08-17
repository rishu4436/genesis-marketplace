import Link from "next/link";
import {
  ADVANTAGE_TASKS,
  advantageTotals,
} from "@/lib/advantage-report";

export const metadata = {
  title: "Agent Advantage Report",
  description:
    "With-agent vs without-agent: time, cost, and quality across three real marketplace tasks.",
};

export default function AdvantagePage() {
  const t = advantageTotals();

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">TermiX · proof</p>
      <h1 className="display-section mt-3 text-white">
        Agent Advantage Report
      </h1>
      <p className="lead mt-4 max-w-2xl">
        Does buying an agent on Genesis beat doing the job yourself? Three real
        tasks run both ways — time, cost, and output quality. At least one is
        trading/security weighted.
      </p>

      {/* Totals */}
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Time saved",
            value: `${t.timeSavedMin} min`,
            sub: `${t.withoutTime}m manual → ${t.withTime}m with agents`,
          },
          {
            label: "Quality lift",
            value: `+${t.qualityLift}`,
            sub: `Avg ${t.withoutQ} → ${t.withQ} / 5`,
          },
          {
            label: "Agent cost",
            value: `$${t.withCost}`,
            sub: `vs $${t.withoutCost} cash (manual time free)`,
          },
        ].map((s) => (
          <div key={s.label} className="panel px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
              {s.label}
            </div>
            <div className="stat-value mt-2 text-2xl sm:text-3xl">{s.value}</div>
            <p className="mt-1 text-[11px] text-white/40">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-8">
        {ADVANTAGE_TASKS.map((task, i) => (
          <article
            key={task.id}
            className="panel-strong overflow-hidden"
          >
            <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-amber-300/80">
                  Task {i + 1}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/55">
                  {task.category}
                </span>
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium capitalize text-rose-200">
                  {task.stakes}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl font-bold text-white">
                {task.title}
              </h2>
              <p className="mt-2 text-sm text-white/55">{task.taskBrief}</p>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-white/[0.06] p-5 md:border-b-0 md:border-r md:border-white/[0.06] sm:p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Without agent
                </h3>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-black/25 py-2">
                    <dt className="text-[10px] text-white/40">Time</dt>
                    <dd className="text-sm font-semibold text-white">
                      {task.without.timeMin}m
                    </dd>
                  </div>
                  <div className="rounded-lg bg-black/25 py-2">
                    <dt className="text-[10px] text-white/40">Cost</dt>
                    <dd className="text-sm font-semibold text-white">
                      ${task.without.costUsd}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-black/25 py-2">
                    <dt className="text-[10px] text-white/40">Quality</dt>
                    <dd className="text-sm font-semibold text-white">
                      {task.without.quality}/5
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-white/45">
                  <span className="text-white/60">Method: </span>
                  {task.without.method}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/55">
                  {task.without.outputSummary}
                </p>
              </div>

              <div className="bg-emerald-500/[0.06] p-5 sm:p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
                  With agent · {task.withAgent.agentName}
                </h3>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-black/25 py-2">
                    <dt className="text-[10px] text-white/40">Time</dt>
                    <dd className="text-sm font-semibold text-emerald-100">
                      {task.withAgent.timeMin}m
                    </dd>
                  </div>
                  <div className="rounded-lg bg-black/25 py-2">
                    <dt className="text-[10px] text-white/40">Cost</dt>
                    <dd className="text-sm font-semibold text-emerald-100">
                      ${task.withAgent.costUsd}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-black/25 py-2">
                    <dt className="text-[10px] text-white/40">Quality</dt>
                    <dd className="text-sm font-semibold text-emerald-100">
                      {task.withAgent.quality}/5
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-white/45">
                  <span className="text-white/60">Method: </span>
                  {task.withAgent.method}
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {task.withAgent.outputTitle}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  {task.withAgent.outputSummary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/genesis/${task.withAgent.genesisSlug}#buy`}
                    className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black"
                  >
                    Buy {task.withAgent.agentName}
                  </Link>
                  {task.withAgent.jobId && (
                    <span className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] text-white/40">
                      {task.withAgent.jobId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="panel mt-12 p-6 text-sm text-white/55">
        <p className="font-semibold text-white/80">Method notes</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
          <li>
            With-agent runs used Genesis marketplace buy path against live or
            local sellers (soft purchase — plan deliverables).
          </li>
          <li>
            Without-agent estimates are realistic manual baselines for the same
            briefs (spreadsheet / explorer / farm UI).
          </li>
          <li>
            Quality scores are rubrics for structure, actionability, and risk
            honesty — not financial advice.
          </li>
          <li>
            Full TermiX export also available at{" "}
            <Link href="/termix" className="text-amber-300 hover:underline">
              /termix
            </Link>
            .
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/hire" className="btn-primary">
          Buy an agent
        </Link>
        <Link href="/termix" className="btn-secondary">
          TermiX workbench
        </Link>
      </div>
    </div>
  );
}
