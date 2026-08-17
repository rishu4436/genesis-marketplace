import Link from "next/link";
import { getJob } from "@/lib/job-store";
import { JobResultClient } from "@/components/JobResultClient";

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
          This share link has no durable record on this server. If you bought
          in this browser, open{" "}
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
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white">
        {job.deliverable?.title || job.agentName}
      </h1>
      <p className="mt-2 text-sm text-white/50">
        {job.agentName}
        {job.quote ? ` · $${job.quote.priceUsd}` : ""} ·{" "}
        <Link href={href} className="text-amber-300 hover:underline">
          Open agent
        </Link>
      </p>

      <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
        <span className="text-white/40">Brief: </span>
        {job.task}
      </p>

      {job.deliverable && (
        <div className="mt-8 space-y-4">
          <p className="text-sm leading-relaxed text-white/70">
            {job.deliverable.summary}
          </p>

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

          {job.deliverable.sections.map((s) => (
            <div
              key={s.heading}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <h2 className="text-xs font-semibold text-amber-200/90">
                {s.heading}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">
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
        <Link href={`${href}#buy`} className="btn-primary !text-sm">
          Buy again
        </Link>
        <Link href="/advantage" className="btn-secondary !text-sm">
          Advantage report
        </Link>
      </div>
    </div>
  );
}
