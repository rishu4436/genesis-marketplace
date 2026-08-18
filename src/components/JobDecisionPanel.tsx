"use client";

import { useState } from "react";
import type { HireJob } from "@/lib/hire-engine";
import type { JobDecision } from "@/lib/job-decision";

export function JobDecisionPanel({ job }: { job: HireJob }) {
  const [decision, setDecision] = useState<JobDecision | null>(
    job.decision ?? null,
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (job.status !== "delivered" || !job.deliverable) return null;
  if (job.purpose === "holdout") return null;

  async function send(action: "accept" | "dispute") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(job.id)}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason: action === "dispute" ? reason : undefined,
          }),
        },
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        decision?: JobDecision;
      };
      if (!json.success || !json.decision) {
        setError(json.error || "Could not record decision");
        return;
      }
      setDecision(json.decision);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"
      aria-label="Accept or dispute"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Decision
      </p>
      <p className="mt-1 text-[11px] text-white/40">
        About the plan only. No payout. Escrow is not required.
      </p>

      {decision ? (
        <p className="mt-3 text-sm text-white/70">
          {decision.state === "accepted" ? "Accepted" : "Disputed"}
          {decision.reason ? ` — ${decision.reason}` : ""}
          <span className="mt-1 block text-[11px] text-white/35">
            Cools rank if disputed. Specialist stays hireable.
          </span>
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="If you dispute, say what was wrong with the plan"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white outline-none ring-amber-400/30 placeholder:text-white/30 focus:ring-1"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => send("accept")}
              className="btn-solid !h-9 !text-xs"
            >
              Accept plan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => send("dispute")}
              className="btn-line !h-9 !text-xs"
            >
              Dispute
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}
    </section>
  );
}
