"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TERMIX_SEED_TASKS,
  armFromJob,
  emptyArm,
  renderReportMarkdown,
  type TermixArm,
  type TermixReport,
  type TermixTask,
  advantage,
} from "@/lib/termix";
import type { HireJob } from "@/lib/hire-engine";

const STORAGE = "genesis-termix-report";

function seedTasks(): TermixTask[] {
  return TERMIX_SEED_TASKS.map((t) => ({
    ...t,
    withAgent: emptyArm("with_agent"),
    withoutAgent: {
      label: "without_agent",
      timeMinutes: t.id === "t1-grid" ? 45 : t.id === "t2-lp" ? 35 : 40,
      costUsd: 0,
      qualityScore: 2.5,
      outputSummary:
        "Manual notes / spreadsheet only — incomplete structure, no standardized risk controls.",
    },
  }));
}

export function TermixWorkbench() {
  const [tasks, setTasks] = useState<TermixTask[]>(seedTasks);
  const [notes, setNotes] = useState(
    "Runs performed via Genesis Marketplace hire wizard against Genesis verified sellers.",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Avoid SSR/client Date + localStorage mismatches (hydration errors)
  const [mounted, setMounted] = useState(false);
  const [preparedAt, setPreparedAt] = useState("—");

  useEffect(() => {
    setMounted(true);
    setPreparedAt(new Date().toISOString());
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as { tasks: TermixTask[]; notes: string };
        if (parsed.tasks?.length) setTasks(parsed.tasks);
        if (parsed.notes) setNotes(parsed.notes);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE, JSON.stringify({ tasks, notes }));
    setPreparedAt(new Date().toISOString());
  }, [tasks, notes, mounted]);

  const report: TermixReport = useMemo(
    () => ({
      project: "Genesis Marketplace",
      marketplace: "https://github.com/rishu4436/genesis-marketplace",
      preparedAt,
      tasks,
      notes,
    }),
    [tasks, notes, preparedAt],
  );

  const md = renderReportMarkdown(report);

  function updateArm(
    id: string,
    arm: "withAgent" | "withoutAgent",
    patch: Partial<TermixArm>,
  ) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, [arm]: { ...t[arm], ...patch } } : t,
      ),
    );
  }

  async function runWithAgent(task: TermixTask) {
    if (!task.genesisSlug) return;
    setBusy(task.id);
    setMsg(null);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: 56,
          tokenId: `genesis:${task.genesisSlug}`,
          agentName: task.genesisSlug,
          genesisSlug: task.genesisSlug,
          categoryId: task.category,
          task: task.description,
          budgetUsd: "15",
          duration: "once",
          risk: task.highStakes ? "medium" : "low",
          autoFulfill: true,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: HireJob;
        error?: string;
      };
      if (!json.success || !json.data) throw new Error(json.error || "Hire failed");
      const arm = armFromJob(json.data);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                withAgent: arm,
                jobId: json.data!.id,
                completedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
      setMsg(`Filled “with agent” for ${task.title} (${json.data.id})`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAllAgents() {
    for (const t of tasks) {
      if (t.genesisSlug) await runWithAgent(t);
    }
  }

  function copyMd() {
    void navigator.clipboard.writeText(md);
    setMsg("Report markdown copied");
  }

  function downloadMd() {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termix-agent-advantage-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Downloaded TermiX report markdown");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runAllAgents()}
          className="rounded-full bg-[#F0B90B] px-4 py-2 text-xs font-semibold text-black"
        >
          Run all “with agent” hires
        </button>
        <button
          type="button"
          onClick={copyMd}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80"
        >
          Copy report markdown
        </button>
        <button
          type="button"
          onClick={downloadMd}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80"
        >
          Download .md
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80"
        >
          My hires
        </Link>
      </div>
      {msg && (
        <p className="text-xs text-amber-200/90">{msg}</p>
      )}

      {tasks.map((t) => {
        const a = advantage(t);
        return (
          <article
            key={t.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">{t.title}</h2>
                <p className="mt-1 text-xs text-white/45">{t.description}</p>
                <p className="mt-1 text-[10px] text-white/35">
                  {t.category}
                  {t.highStakes ? " · high-stakes" : ""} · agent{" "}
                  {t.genesisSlug || "—"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === t.id || !t.genesisSlug}
                onClick={() => void runWithAgent(t)}
                className="rounded-lg bg-amber-400/20 px-3 py-1.5 text-[11px] font-medium text-amber-100 disabled:opacity-40"
              >
                {busy === t.id ? "Hiring…" : "Run with agent"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ArmEditor
                title="Without agent"
                arm={t.withoutAgent}
                onChange={(p) => updateArm(t.id, "withoutAgent", p)}
              />
              <ArmEditor
                title="With agent"
                arm={t.withAgent}
                onChange={(p) => updateArm(t.id, "withAgent", p)}
              />
            </div>
            <p className="mt-3 text-[11px] text-emerald-300/80">
              Advantage: {a.timeSavedMin} min saved · quality Δ{" "}
              {a.qualityDelta.toFixed(1)} · agent cost ${t.withAgent.costUsd}
            </p>
          </article>
        );
      })}

      <label className="block text-xs text-white/50">
        Report notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
        />
      </label>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Markdown preview
        </h3>
        {!mounted ? (
          <p className="mt-3 text-[11px] text-white/40">Loading report preview…</p>
        ) : (
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/70">
            {md}
          </pre>
        )}
      </div>
    </div>
  );
}

function ArmEditor({
  title,
  arm,
  onChange,
}: {
  title: string;
  arm: TermixArm;
  onChange: (p: Partial<TermixArm>) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] font-semibold text-amber-200/90">{title}</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="text-[10px] text-white/40">
          Time (min)
          <input
            type="number"
            value={arm.timeMinutes}
            onChange={(e) =>
              onChange({ timeMinutes: Number(e.target.value) || 0 })
            }
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
          />
        </label>
        <label className="text-[10px] text-white/40">
          Cost $
          <input
            type="number"
            value={arm.costUsd}
            onChange={(e) =>
              onChange({ costUsd: Number(e.target.value) || 0 })
            }
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
          />
        </label>
        <label className="text-[10px] text-white/40">
          Quality
          <input
            type="number"
            min={0}
            max={5}
            step={0.5}
            value={arm.qualityScore}
            onChange={(e) =>
              onChange({ qualityScore: Number(e.target.value) || 0 })
            }
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
          />
        </label>
      </div>
      <textarea
        value={arm.outputSummary}
        onChange={(e) => onChange({ outputSummary: e.target.value })}
        rows={4}
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white/80"
        placeholder="Output summary / paste results"
      />
    </div>
  );
}
