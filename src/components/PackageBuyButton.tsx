"use client";

import Link from "next/link";
import { useState } from "react";
import type { HireJob } from "@/lib/hire-engine";

type Props = {
  packageId: string;
  total: number;
};

export function PackageBuyButton({ packageId, total }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobIds, setJobIds] = useState<string[] | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/packages/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { jobIds: string[]; jobs: HireJob[] };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Package buy failed");
      }
      // Mirror to localStorage for dashboard
      try {
        const prev = JSON.parse(
          localStorage.getItem("genesis-hires") || "[]",
        ) as HireJob[];
        const merged = [...json.data.jobs, ...prev].slice(0, 40);
        localStorage.setItem("genesis-hires", JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      setJobIds(json.data.jobIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (jobIds) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
        <p className="text-sm font-semibold text-emerald-200">
          {jobIds.length} L0 plans ready · no payment
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {jobIds.map((id) => (
            <Link
              key={id}
              href={`/jobs/${encodeURIComponent(id)}`}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-amber-400/40"
            >
              Open result
            </Link>
          ))}
          <Link href="/dashboard" className="btn-primary !px-3 !py-1.5 !text-xs">
            My hires
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-2 text-xs text-rose-300">{error}</p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={buy}
        className="btn-primary w-full sm:w-auto disabled:opacity-50"
      >
        {loading ? "Running specialists…" : "Run L0 package · no charge"}
      </button>
      <p className="mt-2 text-[11px] text-white/40">
        Listed SKU ${total} · plan only · you keep the keys. Not a
        settlement.
      </p>
    </div>
  );
}
