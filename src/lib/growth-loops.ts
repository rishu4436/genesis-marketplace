/**
 * Growth loops that do not buy rank.
 * Share a receipt, compare the same job, hire a package.
 */

export type GrowthLoop = {
  id: "share-receipt" | "compare-job" | "package" | "hire-again";
  label: string;
  href: string;
};

export function growthLoops(opts: {
  task?: string;
  jobId?: string;
  hireHref?: string;
}): GrowthLoop[] {
  const out: GrowthLoop[] = [];
  if (opts.jobId) {
    out.push({
      id: "share-receipt",
      label: "Share this receipt",
      href: `/jobs/${encodeURIComponent(opts.jobId)}`,
    });
  }
  if (opts.task?.trim()) {
    out.push({
      id: "compare-job",
      label: "Compare this job",
      href: `/compare?task=${encodeURIComponent(opts.task.trim())}`,
    });
  }
  out.push({
    id: "package",
    label: "Run a multi-agent package",
    href: "/packages",
  });
  if (opts.hireHref) {
    out.push({
      id: "hire-again",
      label: "Hire again",
      href: opts.hireHref,
    });
  }
  return out;
}
