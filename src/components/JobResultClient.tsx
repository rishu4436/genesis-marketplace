"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HireJob } from "@/lib/hire-engine";

/** Fallback: load job from localStorage if server miss */
export function JobResultClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<HireJob | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("genesis-hires");
      const arr = raw ? (JSON.parse(raw) as HireJob[]) : [];
      setJob(arr.find((j) => j.id === jobId) || null);
    } catch {
      setJob(null);
    }
  }, [jobId]);

  if (!job?.deliverable) {
    return (
      <p className="mt-6 text-sm text-white/40">
        No local copy of this job either.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-medium text-amber-200/80">
        Loaded from this browser
      </p>
      <h2 className="text-lg font-semibold text-white">
        {job.deliverable.title}
      </h2>
      <p className="text-sm text-white/60">{job.deliverable.summary}</p>
      <Link href="/dashboard" className="btn-primary mt-4 inline-flex !text-sm">
        Open My hires
      </Link>
    </div>
  );
}
