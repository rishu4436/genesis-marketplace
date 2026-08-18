"use client";

import { useState, type FormEvent } from "react";
import type { HireJob } from "@/lib/hire-engine";

function persistRecovered(job: HireJob) {
  try {
    const prev = JSON.parse(
      localStorage.getItem("genesis-hires") || "[]",
    ) as HireJob[];
    const next = [job, ...prev.filter((j) => j.id !== job.id)].slice(0, 30);
    localStorage.setItem("genesis-hires", JSON.stringify(next));
    return next;
  } catch {
    return [job];
  }
}

export function RecoverHireBox({
  onRecovered,
}: {
  onRecovered?: (jobs: HireJob[]) => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function recover(e: FormEvent) {
    e.preventDefault();
    const raw = q.trim();
    if (!raw) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/jobs?q=${encodeURIComponent(raw)}`);
      const json = (await res.json()) as {
        success?: boolean;
        data?: HireJob;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || "No hire found for that receipt");
      }
      const recovered = json.data;
      try {
        await fetch("/api/profile/hires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: recovered.id }),
        });
      } catch {
        /* guest recover still works locally */
      }
      onRecovered?.(persistRecovered(recovered));
      setQ("");
      if (!onRecovered) {
        window.location.assign(`/jobs/${encodeURIComponent(recovered.id)}`);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={recover}
      className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"
    >
      <p className="text-xs font-semibold text-amber-100">Open a receipt</p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/50">
        No account? Paste the result link or claim code (GX-XXX-XXX). If you
        are signed in, it is saved to this account.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="GX-7K2-M9P or /jobs/job_…"
          className="w-full flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="btn-primary !rounded-xl !py-2 !text-sm disabled:opacity-40"
        >
          {busy ? "Looking…" : "Open receipt"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-200">{err}</p>}
    </form>
  );
}
