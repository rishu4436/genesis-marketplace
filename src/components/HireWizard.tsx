"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CategoryId } from "@/lib/categories";
import {
  DURATION_LABELS,
  RISK_LABELS,
  TASK_TEMPLATES,
  type HireIntent,
} from "@/lib/hire";
import type { HireJob } from "@/lib/hire-engine";

type Props = {
  chainId: number;
  tokenId: string;
  agentName: string;
  categoryId?: CategoryId | null;
  genesisSlug?: string;
};

function persistJob(job: HireJob) {
  try {
    const prev = JSON.parse(
      localStorage.getItem("genesis-hires") || "[]",
    ) as HireJob[];
    const next = [job, ...prev.filter((j) => j.id !== job.id)].slice(0, 30);
    localStorage.setItem("genesis-hires", JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function HireWizard({
  chainId,
  tokenId,
  agentName,
  categoryId,
  genesisSlug,
}: Props) {
  const templates = categoryId ? TASK_TEMPLATES[categoryId] : [];
  const [step, setStep] = useState(1);
  const [task, setTask] = useState(templates[0] || "");
  const [budgetUsd, setBudgetUsd] = useState("10");
  const [duration, setDuration] = useState<HireIntent["duration"]>("once");
  const [risk, setRisk] = useState<HireIntent["risk"]>("low");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<HireJob | null>(null);

  const canContinue = useMemo(() => task.trim().length > 8, [task]);

  async function runHire() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId,
          tokenId,
          agentName,
          genesisSlug,
          categoryId,
          task,
          budgetUsd,
          duration,
          risk,
          notes,
          autoFulfill: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: HireJob;
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Hire request failed");
      }
      setJob(json.data);
      persistJob(json.data);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hire failed");
    } finally {
      setLoading(false);
    }
  }

  if (job && step === 4) {
    const d = job.deliverable;
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-300">
              Job {job.status}
            </div>
            <span className="font-mono text-[10px] text-white/35">{job.id}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {d?.title || "Hire complete"}
          </h3>
          <p className="mt-2 text-sm text-white/65">{d?.summary}</p>

          {job.quote && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-black/25 px-2 py-2">
                <div className="text-[10px] text-white/40">Quote</div>
                <div className="text-sm font-semibold text-white">
                  ${job.quote.priceUsd}
                </div>
              </div>
              <div className="rounded-lg bg-black/25 px-2 py-2">
                <div className="text-[10px] text-white/40">ETA</div>
                <div className="text-sm font-semibold text-white">
                  {job.quote.etaMinutes}m
                </div>
              </div>
              <div className="rounded-lg bg-black/25 px-2 py-2">
                <div className="text-[10px] text-white/40">Protocol</div>
                <div className="text-[11px] font-semibold text-amber-200">
                  ERC-8183
                </div>
              </div>
            </div>
          )}

          {d?.metrics && (
            <dl className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3">
              {d.metrics.map((m) => (
                <div
                  key={m.label}
                  className="flex justify-between gap-2 text-xs"
                >
                  <dt className="text-white/40">{m.label}</dt>
                  <dd className="text-right font-medium text-white/85">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {d?.sections.map((s) => (
          <div
            key={s.heading}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <h4 className="text-xs font-semibold text-amber-200/90">
              {s.heading}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{s.body}</p>
          </div>
        ))}

        {d?.disclaimer && (
          <p className="text-[10px] leading-relaxed text-white/35">
            {d.disclaimer}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#F0B90B] px-3 py-2 text-xs font-semibold text-black"
          >
            My hires
          </Link>
          <button
            type="button"
            onClick={() => {
              setJob(null);
              setStep(1);
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
          >
            Hire again
          </button>
        </div>

        {job.timeline?.length > 0 && (
          <details className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/50">
            <summary className="cursor-pointer font-medium text-white/70">
              Negotiate timeline
            </summary>
            <ul className="mt-2 space-y-1.5 border-l border-white/10 pl-3">
              {job.timeline.map((t, i) => (
                <li key={`${t.at}-${i}`}>
                  <span className="text-amber-200/80">{t.status}</span> —{" "}
                  {t.detail}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
          Hire · ERC-8183 · step {step}/3
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 w-6 rounded-full ${
                s <= step ? "bg-amber-400" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      {genesisSlug && (
        <p className="mt-2 text-[10px] text-amber-200/70">
          Genesis verified seller · full negotiate → deliver demo
        </p>
      )}

      {step === 1 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">What should it do?</h3>
          {templates.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {templates.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTask(t)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    task === t
                      ? "border-amber-400/50 bg-amber-400/10 text-amber-50"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            placeholder="Describe the job…"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
          />
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep(2)}
            className="w-full rounded-xl bg-[#F0B90B] py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Budget & risk</h3>
          <label className="block text-xs text-white/50">
            Max budget (USD)
            <input
              type="number"
              min={0}
              step={1}
              value={budgetUsd}
              onChange={(e) => setBudgetUsd(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </label>
          <div>
            <div className="text-xs text-white/50">Duration</div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(Object.keys(DURATION_LABELS) as HireIntent["duration"][]).map(
                (d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`rounded-lg px-2 py-2 text-[11px] ${
                      duration === d
                        ? "bg-amber-400 text-black"
                        : "bg-white/10 text-white/65"
                    }`}
                  >
                    {DURATION_LABELS[d]}
                  </button>
                ),
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50">Risk posture</div>
            <div className="mt-1.5 flex flex-col gap-1">
              {(Object.keys(RISK_LABELS) as HireIntent["risk"][]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRisk(r)}
                  className={`rounded-lg px-3 py-2 text-left text-[11px] ${
                    risk === r
                      ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/40"
                      : "bg-white/5 text-white/60"
                  }`}
                >
                  {RISK_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-white/70"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-[#F0B90B] py-2.5 text-sm font-semibold text-black"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Confirm & hire</h3>
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white/70">
            <p>
              <span className="text-white/40">Agent: </span>
              {agentName}
            </p>
            <p>
              <span className="text-white/40">Task: </span>
              {task}
            </p>
            <p>
              <span className="text-white/40">Budget: </span>${budgetUsd} ·{" "}
              {DURATION_LABELS[duration]}
            </p>
            <p>
              <span className="text-white/40">Risk: </span>
              {RISK_LABELS[risk]}
            </p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes (pair, wallet, HF, bounds)…"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <p className="text-[10px] leading-relaxed text-white/40">
            Flow: negotiate → quote → fund (simulated) → deliver. No user fund
            custody on Genesis. Live ERC-8183 service endpoints plug in later.
          </p>
          {error && (
            <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-white/70"
            >
              Back
            </button>
            <button
              type="button"
              onClick={runHire}
              disabled={loading}
              className="flex-1 rounded-xl bg-[#F0B90B] py-2.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {loading ? "Negotiating…" : "Negotiate & hire"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
