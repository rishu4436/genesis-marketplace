import Link from "next/link";
import type { AdmissionReport } from "@/lib/admission";

const GRADE: Record<AdmissionReport["grade"], string> = {
  admitted: "Admitted",
  probation: "Probation",
  failed: "Failed",
};

export function AdmissionPanel({ report }: { report: AdmissionReport }) {
  return (
    <section
      className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      aria-label="Admission"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Admission
        </p>
        <span
          className={
            report.grade === "admitted"
              ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"
              : report.grade === "probation"
                ? "rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
                : "rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300"
          }
        >
          {GRADE[report.grade]}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
          Hireable
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/40">
          {report.suiteId}
        </span>
      </div>

      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {report.checks.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-[11px]"
          >
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                c.ok ? "bg-emerald-400" : "bg-white/25"
              }`}
            />
            <span>
              <span className="capitalize text-white/70">{c.id}</span>
              <span className="mt-0.5 block text-white/40">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-white/40">
        Holdout {report.holdout.id} is a private shadow job. You do not pay
        it. Sellers cannot opt out.
      </p>
      <p className="mt-2">
        <Link
          href={`/api/admission/${report.slug}`}
          className="text-[11px] text-amber-300 hover:underline"
        >
          Open machine admission
        </Link>
      </p>
    </section>
  );
}
