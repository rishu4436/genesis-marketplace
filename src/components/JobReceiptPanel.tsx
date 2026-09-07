import Link from "next/link";
import type { HireJob } from "@/lib/hire-engine";
import { jobWithEvidence } from "@/lib/job-receipt";
import { skuQuotedLine } from "@/lib/sku-label";
import { CopyClaimCode } from "@/components/CopyClaimCode";

function shortHash(hex: string | null): string {
  if (!hex) return "—";
  if (hex.length <= 20) return hex;
  return `${hex.slice(0, 12)}…${hex.slice(-8)}`;
}

export function JobReceiptPanel({ job }: { job: HireJob }) {
  const { spec, receipt, verify } = jobWithEvidence(job);

  return (
    <section
      className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4"
      aria-label="Hire receipt"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Receipt
        </p>
        <span
          className={
            verify.ok
              ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"
              : "rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300"
          }
        >
          {verify.ok ? "Verified" : "Check failed"}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
          {receipt.acceptance.state === "accepted"
            ? "Accepted"
            : receipt.acceptance.state === "disputed"
              ? "Disputed"
              : receipt.acceptance.state === "auto-schema-valid"
                ? "Schema valid"
                : "Incomplete"}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
          {job.escrow?.fundTx
            ? "On-chain lock · settle after deliverable"
            : "Plan only · no custody"}
        </span>
      </div>
      {job.claimCode && (
        <div className="mt-2">
          <CopyClaimCode code={job.claimCode} />
        </div>
      )}
      <p className="mt-2 text-[11px] text-white/50">{skuQuotedLine(job)}</p>
      {job.quote?.protocol === "ERC-8183-sim" && (
        <p className="mt-1 text-[10px] text-white/35">
          Soft-hire sim — not mainnet escrow proof.
        </p>
      )}

      <dl className="mt-3 grid gap-2 text-[11px] text-white/55 sm:grid-cols-2">
        <div>
          <dt className="text-white/35">Spec</dt>
          <dd className="mt-0.5 font-mono break-all">{shortHash(receipt.specHash)}</dd>
        </div>
        <div>
          <dt className="text-white/35">Output</dt>
          <dd className="mt-0.5 font-mono break-all">
            {shortHash(receipt.outputHash)}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Seller</dt>
          <dd className="mt-0.5 font-mono break-all">{receipt.sellerVersion}</dd>
        </div>
        <div>
          <dt className="text-white/35">Venues in mandate</dt>
          <dd className="mt-0.5">{spec.mandate.venues.join(" · ") || "bsc"}</dd>
        </div>
      </dl>

      {!verify.ok && verify.issues.length > 0 && (
        <ul className="mt-3 space-y-1 text-[11px] text-rose-200/80">
          {verify.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <p className="mt-3">
        <Link
          href={`/api/jobs/${encodeURIComponent(job.id)}/receipt`}
          className="text-[11px] text-amber-300 hover:underline"
        >
          Open machine receipt
        </Link>
      </p>
    </section>
  );
}
