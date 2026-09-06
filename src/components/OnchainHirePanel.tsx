"use client";

import { useState } from "react";
import Link from "next/link";

const SELLERS = [
  { slug: "yield-router", label: "YieldRouter" },
  { slug: "health-sentinel", label: "HealthSentinel" },
  { slug: "range-keeper", label: "RangeKeeper" },
  { slug: "gridwright", label: "Gridwright" },
];

export function OnchainHirePanel() {
  const [slug, setSlug] = useState("yield-router");
  const [task, setTask] = useState(
    "Find best risk-adjusted yield for USDT on BSC; include PCS farms",
  );
  const [budgetU, setBudgetU] = useState("0.5");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");
  const [jobId, setJobId] = useState<number | null>(null);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/hire/onchain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      hint?: string;
      data?: unknown;
    };
    return { res, json };
  }

  async function runBuy() {
    setBusy(true);
    setLog("Running bag erc8183 buy + notify_funded…");
    try {
      const { json } = await post({
        action: "buy",
        genesisSlug: slug,
        task,
        budgetU: Number(budgetU) || 0.5,
        deadlineMin: 60,
      });
      setLog(JSON.stringify(json, null, 2));
      const buy = (json.data as { buy?: { jobId?: number } } | undefined)?.buy;
      if (buy?.jobId) setJobId(buy.jobId);
    } catch (e) {
      setLog(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function runStatus() {
    if (!jobId) return;
    setBusy(true);
    try {
      const { json } = await post({ action: "status", jobId });
      setLog(JSON.stringify(json, null, 2));
    } finally {
      setBusy(false);
    }
  }

  async function runFetch() {
    if (!jobId) return;
    setBusy(true);
    try {
      const { json } = await post({ action: "fetch", jobId });
      setLog(JSON.stringify(json, null, 2));
    } finally {
      setBusy(false);
    }
  }

  async function runSettle(settleAction: "approve" | "dispute") {
    if (!jobId) return;
    setBusy(true);
    try {
      const { json } = await post({
        action: "settle",
        jobId,
        settleAction,
      });
      setLog(JSON.stringify(json, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <label className="block text-xs text-white/50">
        Seller
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
        >
          {SELLERS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-white/50">
        Task
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="block text-xs text-white/50">
        Budget (U)
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={budgetU}
          onChange={(e) => setBudgetU(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runBuy()}
          className="rounded-full bg-[#F0B90B] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
        >
          {busy ? "Working…" : "Buy on-chain (fund)"}
        </button>
        <button
          type="button"
          disabled={busy || !jobId}
          onClick={() => void runStatus()}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 disabled:opacity-40"
        >
          Status
        </button>
        <button
          type="button"
          disabled={busy || !jobId}
          onClick={() => void runFetch()}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 disabled:opacity-40"
        >
          Fetch deliverable
        </button>
        <button
          type="button"
          disabled={busy || !jobId}
          onClick={() => void runSettle("dispute")}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 disabled:opacity-40"
        >
          Settle dispute
        </button>
        <button
          type="button"
          disabled={busy || !jobId}
          onClick={() => void runSettle("approve")}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 disabled:opacity-40"
          title="Only works after 24h dispute window"
        >
          Settle approve (after 24h)
        </button>
      </div>

      {jobId != null && (
        <p className="text-xs text-emerald-300">
          job_id: <span className="font-mono">{jobId}</span>
        </p>
      )}

      {log && (
        <pre className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[10px] leading-relaxed text-white/70">
          {log}
        </pre>
      )}

      <p className="text-[10px] text-white/40">
        If buy fails with insufficient funds / balance, complete faucets above
        first. Soft hire without chain:{" "}
        <Link href="/genesis/yield-router" className="text-amber-300">
          /genesis/yield-router
        </Link>
      </p>
    </div>
  );
}
