"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HireJob } from "@/lib/hire-engine";

export function HireDashboard() {
  const [jobs, setJobs] = useState<HireJob[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("genesis-hires");
      const arr = raw ? (JSON.parse(raw) as HireJob[]) : [];
      setJobs(Array.isArray(arr) ? arr : []);
    } catch {
      setJobs([]);
    }
  }, []);

  function clearAll() {
    localStorage.removeItem("genesis-hires");
    setJobs([]);
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
        <p className="text-sm text-white/50">No hires yet.</p>
        <p className="mt-1 text-xs text-white/35">
          Hire a Genesis verified agent to see negotiate → deliver here.
        </p>
        <Link
          href="/categories"
          className="mt-4 inline-block text-sm font-medium text-amber-300"
        >
          Browse categories →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-white/40 hover:text-white/70"
        >
          Clear all
        </button>
      </div>
      {jobs.map((h) => {
        const expanded = openId === h.id;
        const href = h.genesisSlug
          ? `/genesis/${h.genesisSlug}`
          : `/agents/${h.chainId}/${h.tokenId}`;

        return (
          <article
            key={h.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {h.agentName || `Agent ${h.chainId}:${h.tokenId}`}
                </h2>
                <p className="mt-0.5 font-mono text-[10px] text-white/35">
                  {h.id} · {h.status}
                  {h.genesisSlug ? " · genesis" : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  h.status === "delivered"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-amber-400/15 text-amber-200"
                }`}
              >
                {h.quote ? `$${h.quote.priceUsd}` : `$${h.budgetUsd}`} ·{" "}
                {h.status}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/65">{h.task}</p>

            {expanded && h.deliverable && (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <h3 className="text-xs font-semibold text-amber-200">
                  {h.deliverable.title}
                </h3>
                <p className="text-xs text-white/60">{h.deliverable.summary}</p>
                {h.deliverable.sections.slice(0, 3).map((s) => (
                  <div key={s.heading}>
                    <div className="text-[10px] font-medium text-white/40">
                      {s.heading}
                    </div>
                    <p className="text-xs text-white/55">{s.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/35">
              <span>
                {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
              </span>
              <div className="flex gap-3">
                {h.deliverable && (
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : h.id)}
                    className="text-amber-300 hover:underline"
                  >
                    {expanded ? "Hide result" : "View result"}
                  </button>
                )}
                <Link href={href} className="text-amber-300 hover:underline">
                  Open agent →
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
