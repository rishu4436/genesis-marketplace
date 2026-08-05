"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HireEntry = {
  id: string;
  chainId: number;
  tokenId: string;
  agentName?: string;
  task: string;
  budgetUsd: string;
  duration: string;
  risk: string;
  createdAt: string;
  status: string;
};

export function HireDashboard() {
  const [hires, setHires] = useState<HireEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("genesis-hires");
      const arr = raw ? (JSON.parse(raw) as HireEntry[]) : [];
      setHires(Array.isArray(arr) ? arr : []);
    } catch {
      setHires([]);
    }
  }, []);

  function clearAll() {
    localStorage.removeItem("genesis-hires");
    setHires([]);
  }

  if (hires.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
        <p className="text-sm text-white/50">No hire intents yet.</p>
        <Link
          href="/browse"
          className="mt-4 inline-block text-sm font-medium text-amber-300"
        >
          Browse marketplace →
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
      {hires.map((h) => (
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
                {h.chainId}:{h.tokenId} · {h.status}
              </p>
            </div>
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              ${h.budgetUsd} · {h.duration} · {h.risk}
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/65">{h.task}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/35">
            <span>
              {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
            </span>
            <Link
              href={`/agents/${h.chainId}/${h.tokenId}`}
              className="text-amber-300 hover:underline"
            >
              Open agent →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
