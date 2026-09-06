import Link from "next/link";
import { getJob } from "@/lib/job-store";
import { JobResultClient } from "@/components/JobResultClient";
import { JobReceiptPanel } from "@/components/JobReceiptPanel";
import { JobSessionPanel } from "@/components/JobSessionPanel";
import { JobDecisionPanel } from "@/components/JobDecisionPanel";
import { HirePartnerFollowup } from "@/components/HirePartnerFollowup";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const job = await getJob(decodeURIComponent(id));
  return {
    title: job?.deliverable?.title || job?.agentName || "Job result",
    description: job?.deliverable?.summary || job?.task,
  };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(decodeURIComponent(id));

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <h1 className="display-section text-white">Job not found</h1>
        <p className="body mt-3">
          This receipt is not on this server. Recover it from{" "}
          <Link href="/dashboard" className="text-amber-300 hover:underline">
            My hires
          </Link>
          .
        </p>
        <JobResultClient jobId={decodeURIComponent(id)} />
      </div>
    );
  }

  const href = job.genesisSlug
    ? `/genesis/${job.genesisSlug}`
    : `/agents/${job.chainId}/${job.tokenId}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/dashboard"
        className="text-xs font-medium text-white/45 hover:text-amber-300"
      >
        ← My hires
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
          {job.status === "delivered" ? "Delivered" : job.status}
        </span>
        <span className="font-mono text-[11px] text-white/30">{job.id}</span>
        {job.claimCode && (
          <span className="rounded-full border border-amber-400/25 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-200">
            {job.claimCode}
          </span>
        )}
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white">
        {job.deliverable?.title || job.agentName}
      </h1>
      <p className="mt-2 text-sm text-white/50">
        {job.agentName}
        {job.quote ? ` · $${job.quote.priceUsd}` : ""}
        {job.payment
          ? job.payment.method === "card"
            ? ` · demo card •••• ${job.payment.last4}`
            : ` · on-chain ${job.payment.amountBnb || ""} BNB`
          : ""}{" "}
        ·{" "}
        <Link href={href} className="text-amber-300 hover:underline">
          Open agent
        </Link>
        {job.payment?.txHash && (
          <>
            {" · "}
            <a
              href={`https://bscscan.com/tx/${job.payment.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 hover:underline"
            >
              BSC tx
            </a>
          </>
        )}
      </p>

      <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
        <span className="text-white/40">Brief: </span>
        {job.task}
      </p>
      <p className="mt-3 text-[12px] leading-relaxed text-white/40">
        Plan only. You keep the keys. Soft hire is free — optional on-chain lock is BSC mainnet ERC-8183.
      </p>

      <JobReceiptPanel job={job} />
      <JobSessionPanel job={job} />
      <JobDecisionPanel job={job} />

      <div className="mt-8">
        <HirePartnerFollowup
          jobId={job.id}
          genesisSlug={job.genesisSlug}
          categoryId={job.categoryId}
          chainId={job.chainId}
          tokenId={job.tokenId}
        />
      </div>

      {job.deliverable && (
        <div className="mt-8 space-y-4">
          <p className="text-sm leading-relaxed text-white/70">
            {job.deliverable.summary}
          </p>
          {job.deliverable.sections[0] && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                What to do now
              </p>
              <h2 className="mt-1 text-sm font-semibold text-white">
                {job.deliverable.sections[0].heading}
              </h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/65">
                {job.deliverable.sections[0].body}
              </p>
            </div>
          )}

          {job.deliverable.metrics?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.deliverable.metrics.map((m) => (
                <span
                  key={m.label}
                  className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-[11px] text-white/55"
                >
                  <span className="text-white/35">{m.label}: </span>
                  {m.value}
                </span>
              ))}
            </div>
          )}

          {job.deliverable.sections.slice(1).map((s) => (
            <div
              key={s.heading}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <h2 className="text-xs font-semibold text-amber-200/90">
                {s.heading}
              </h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {s.body}
              </p>
            </div>
          ))}

          {job.deliverable.disclaimer && (
            <p className="text-[11px] leading-relaxed text-white/35">
              {job.deliverable.disclaimer}
            </p>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/dashboard" className="btn-solid !text-sm">
          My hires
        </Link>
        <Link
          href={`${href}${job.task ? `?task=${encodeURIComponent(job.task)}` : ""}#buy`}
          className="btn-line !text-sm"
        >
          Hire again
        </Link>
        {job.task && (
          <Link
            href={`/compare?task=${encodeURIComponent(job.task)}`}
            className="btn-line !text-sm"
          >
            Compare this job
          </Link>
        )}
        <Link href="/packages" className="btn-line !text-sm">
          Packages
        </Link>
      </div>
    </div>
  );
}
