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

type Props = {
  chainId: number;
  tokenId: string;
  agentName: string;
  categoryId?: CategoryId | null;
};

export function HireWizard({
  chainId,
  tokenId,
  agentName,
  categoryId,
}: Props) {
  const templates = categoryId ? TASK_TEMPLATES[categoryId] : [];
  const [step, setStep] = useState(1);
  const [task, setTask] = useState(templates[0] || "");
  const [budgetUsd, setBudgetUsd] = useState("10");
  const [duration, setDuration] = useState<HireIntent["duration"]>("once");
  const [risk, setRisk] = useState<HireIntent["risk"]>("low");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const intent: HireIntent = useMemo(
    () => ({
      chainId,
      tokenId,
      agentName,
      categoryId,
      task,
      budgetUsd,
      duration,
      risk,
      notes,
    }),
    [chainId, tokenId, agentName, categoryId, task, budgetUsd, duration, risk, notes],
  );

  function onConfirm() {
    try {
      const prev = JSON.parse(
        localStorage.getItem("genesis-hires") || "[]",
      ) as unknown[];
      const entry = {
        ...intent,
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: "intent_recorded",
      };
      localStorage.setItem(
        "genesis-hires",
        JSON.stringify([entry, ...prev].slice(0, 20)),
      );
    } catch {
      /* ignore */
    }
    setSubmitted(true);
    setStep(4);
  }

  if (submitted || step === 4) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-emerald-300">
          Hire intent saved
        </div>
        <h3 className="mt-2 text-lg font-semibold text-white">
          Ready for on-chain hire
        </h3>
        <p className="mt-2 text-sm text-white/60">
          Your job brief for <strong className="text-white">{agentName}</strong>{" "}
          is stored locally. Next build step: wire ERC-8183{" "}
          <code className="text-emerald-200/90">/negotiate</code> so this
          becomes a funded job on BSC.
        </p>
        <dl className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
          <div>
            <span className="text-white/40">Task: </span>
            {task || "—"}
          </div>
          <div>
            <span className="text-white/40">Budget: </span>${budgetUsd} ·{" "}
            {DURATION_LABELS[duration]} · {RISK_LABELS[risk]}
          </div>
          <div className="font-mono text-[10px] text-white/40">
            agent {chainId}:{tokenId}
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#F0B90B] px-3 py-2 text-xs font-semibold text-black"
          >
            View my hires
          </Link>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setStep(1);
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
          >
            Edit brief
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
          Hire wizard · step {step}/3
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
            disabled={!task.trim()}
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
            Budget (USD equivalent)
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
          <h3 className="text-sm font-semibold text-white">Confirm hire brief</h3>
          <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white/70 space-y-2">
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
            placeholder="Optional notes (pairs, wallet, constraints)…"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <p className="text-[10px] leading-relaxed text-white/40">
            Genesis does not custody user funds. On-chain settle will use ERC-8183
            + x402 when connected. This step records a marketplace hire intent.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-white/70"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-[#F0B90B] py-2.5 text-sm font-semibold text-black"
            >
              Confirm hire intent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
