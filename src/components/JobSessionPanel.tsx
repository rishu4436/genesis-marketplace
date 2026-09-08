import Link from "next/link";
import type { HireJob } from "@/lib/hire-engine";
import { ESCROW_STANCE } from "@/lib/escrow-stance";

export function JobSessionPanel({ job }: { job: HireJob }) {
  const session = job.session;
  if (!session) {
    return (
      <section
        className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"
        aria-label="Job session"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Session
        </p>
        <p className="mt-2 text-[12px] text-white/45">
          Legacy hire — no isolation envelope. New hires get a plan-only
          session that is revoked when the plan lands.
        </p>
        <p className="mt-2 text-[11px] text-white/35">
          {job.escrow?.fundTx
            ? "Plan session is separate from the $U lock"
            : `Plan session · escrow optional · ${ESCROW_STANCE.reason}`}
        </p>
      </section>
    );
  }

  const iso = job.isolation;
  return (
    <section
      className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"
      aria-label="Job session"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Session
        </p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
          {session.status}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
          Spend {session.policy.spend} · no funds
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
          {job.escrow?.fundTx
            ? "Plan session · $U lock is separate"
            : "Plan session · escrow optional"}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-[11px] text-white/55 sm:grid-cols-2">
        <div>
          <dt className="text-white/35">Session id</dt>
          <dd className="mt-0.5 font-mono break-all">{session.id}</dd>
        </div>
        <div>
          <dt className="text-white/35">Hosts allowed</dt>
          <dd className="mt-0.5">{session.policy.hosts.join(" · ")}</dd>
        </div>
        <div>
          <dt className="text-white/35">Calls</dt>
          <dd className="mt-0.5">
            {iso ? `${iso.callCount} / ${session.policy.maxCalls}` : "—"}
            {iso?.killed ? ` · killed (${iso.killReason})` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Closed</dt>
          <dd className="mt-0.5">{session.closeReason || "—"}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-white/40">
        Isolation spend 0 — the session cannot move funds. SKU $ is not a
        charge. This is not an Altana spend key. Secrets never sit on this
        envelope.
      </p>
      <p className="mt-2">
        <Link
          href={`/api/jobs/${encodeURIComponent(job.id)}/session`}
          className="text-[11px] text-amber-300 hover:underline"
        >
          Open machine session
        </Link>
      </p>
    </section>
  );
}
