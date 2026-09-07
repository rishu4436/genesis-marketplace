"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HireJob, HireStatus } from "@/lib/hire-engine";
import { jobOutcome } from "@/lib/job-outcome";
import { BRAND } from "@/lib/brand";
import { HireAccountBar } from "@/components/HireAccountBar";
import { RecoverHireBox } from "@/components/RecoverHireBox";

function statusStyle(job: HireJob) {
  const kind = jobOutcome(job).kind;
  switch (kind) {
    case "ready":
      return "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20";
    case "disputed":
      return "bg-rose-400/15 text-rose-300 ring-rose-400/20";
    case "funded":
    case "working":
      return "bg-sky-400/15 text-sky-300 ring-sky-400/20";
    case "quoted":
      return "bg-amber-400/15 text-amber-200 ring-amber-400/20";
    default:
      if (job.status === "failed") {
        return "bg-rose-400/15 text-rose-300 ring-rose-400/20";
      }
      return "bg-white/10 text-white/60 ring-white/10";
  }
}

/** User-facing label — hide internal negotiate jargon */
function statusLabel(job: HireJob) {
  const out = jobOutcome(job);
  if (out.kind === "disputed") return out.label;
  if (out.kind === "quoted") return out.label;
  if (out.kind === "funded" || out.kind === "working") return out.label;
  if (out.kind === "ready") return out.label;
  switch (job.status as HireStatus | string) {
    case "failed":
      return "Failed";
    default:
      return job.status;
  }
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function HireDashboard() {
  const [jobs, setJobs] = useState<HireJob[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  function loadLocal(): HireJob[] {
    try {
      const raw = localStorage.getItem("genesis-hires");
      const arr = raw ? (JSON.parse(raw) as HireJob[]) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  async function loadServerFirst() {
    const local = loadLocal();
    const ac = new AbortController();
    const t = window.setTimeout(() => ac.abort(), 6000);
    try {
      const r = await fetch("/api/profile/hires", { signal: ac.signal });
      const j = (await r.json()) as { data?: HireJob[]; signedIn?: boolean };
      if (r.ok && Array.isArray(j.data)) {
        const map = new Map<string, HireJob>();
        for (const job of [...j.data, ...local]) map.set(job.id, job);
        const merged = [...map.values()].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setJobs(merged);
        setSignedIn(true);
        return;
      }
    } catch {
      /* guest or timeout — show local, never spin forever */
    } finally {
      window.clearTimeout(t);
    }
    setSignedIn(false);
    setJobs(local);
  }

  useEffect(() => {
    setJobs(loadLocal());
    loadServerFirst().finally(() => setReady(true));
  }, []);

  const stats = useMemo(() => {
    const delivered = jobs.filter(
      (j) => jobOutcome(j).kind === "ready",
    ).length;
    const active = jobs.filter(
      (j) => j.status !== "delivered" && j.status !== "failed",
    ).length;
    return { total: jobs.length, delivered, active };
  }, [jobs]);

  function clearAll() {
    localStorage.removeItem("genesis-hires");
    setJobs([]);
    setOpenId(null);
  }

  if (jobs.length === 0) {
    return (
      <div className="panel-strong relative overflow-hidden px-6 py-16 text-center sm:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(240,185,11,0.1), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 font-display text-xl text-amber-300">
            ∅
          </div>
          <h2 className="card-title mt-6 text-xl">
            {signedIn
              ? "No hires on this account yet"
              : "No plans on this device"}
          </h2>
          <p className="body mx-auto mt-3 max-w-sm">
            {signedIn
              ? "Hire a specialist. The plan is saved to this account."
              : "Sign in to see hires from another browser, or paste a claim code. Guest hires still work from Hire — no account required for a plan."}
          </p>
          {!ready && (
            <p className="mt-2 text-[11px] text-white/35">
              Checking account in the background…
            </p>
          )}
          <div className="mx-auto mt-6 max-w-md space-y-4 text-left">
            <HireAccountBar
              onChange={(ok) => {
                setSignedIn(ok);
                if (ok) void loadServerFirst();
              }}
            />
            <RecoverHireBox
              onRecovered={(next) => {
                setJobs(next);
                if (next[0]) setOpenId(next[0].id);
              }}
            />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/hire" className="btn-solid">
              Get a new plan
            </Link>
            <Link href="/hire" className="btn-line">
              Shop by job
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HireAccountBar
        onChange={(ok) => {
          setSignedIn(ok);
          void loadServerFirst();
        }}
      />
      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total hires", value: stats.total },
          { label: "Delivered", value: stats.delivered },
          { label: "In progress", value: stats.active },
        ].map((s) => (
          <div key={s.label} className="panel px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
              {s.label}
            </div>
            <div className="stat-value mt-2 text-3xl">{s.value}</div>
          </div>
        ))}
      </div>

      <RecoverHireBox
        onRecovered={(next) => {
          setJobs(next);
          if (next[0]) setOpenId(next[0].id);
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/45">
          {jobs.length} hire{jobs.length === 1 ? "" : "s"}
          {signedIn ? " on this account" : " on this device"}
        </p>
        {!signedIn && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/45 transition hover:border-white/20 hover:text-white/70"
          >
            Clear this device
          </button>
        )}
      </div>

      <div className="space-y-3">
        {jobs.map((h) => {
          const expanded = openId === h.id;
          const href = h.genesisSlug
            ? `/genesis/${h.genesisSlug}`
            : `/agents/${h.chainId}/${h.tokenId}`;
          const price = h.quote?.priceUsd ?? Number(h.budgetUsd) ?? 0;

          return (
            <article
              key={h.id}
              className="panel group overflow-hidden transition-colors hover:border-white/12"
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="card-title text-lg">
                        {h.agentName || `Agent ${h.chainId}:${h.tokenId}`}
                      </h2>
                      {h.genesisSlug && (
                        <span
                          className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                          title={BRAND.specialistLabel}
                        >
                          {BRAND.byBadge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-white/30">
                      {h.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold tabular-nums text-white/80">
                      ${typeof price === "number" ? price.toFixed(2) : price}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyle(
                        h,
                      )}`}
                    >
                      {statusLabel(h)}
                    </span>
                  </div>
                </div>

                <p className="body-sm mt-4 line-clamp-2">{h.task}</p>

                {expanded && h.deliverable && (
                  <div className="mt-5 space-y-4 rounded-xl border border-white/[0.08] bg-black/25 p-4 sm:p-5">
                    <div>
                      <h3 className="card-title text-base text-amber-100">
                        {h.deliverable.title}
                      </h3>
                      <p className="body-sm mt-2">{h.deliverable.summary}</p>
                    </div>
                    {h.deliverable.sections.slice(0, 4).map((s) => (
                      <div key={s.heading}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">
                          {s.heading}
                        </div>
                        <p className="body-sm mt-1.5">{s.body}</p>
                      </div>
                    ))}
                    {h.deliverable.metrics?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {h.deliverable.metrics.slice(0, 4).map((m) => (
                          <span
                            key={m.label}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/55"
                          >
                            <span className="text-white/35">{m.label}: </span>
                            <span className="font-medium text-white/80">
                              {m.value}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <span
                    className="text-xs font-medium text-white/35"
                    suppressHydrationWarning
                  >
                    {formatWhen(h.createdAt)}
                    {h.quote?.protocol ? ` · ${h.quote.protocol}` : ""}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {h.deliverable && (
                      <button
                        type="button"
                        onClick={() => setOpenId(expanded ? null : h.id)}
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-400/30 hover:text-amber-100"
                      >
                        {expanded ? "Hide result" : "View result"}
                      </button>
                    )}
                    <Link
                      href={`/jobs/${encodeURIComponent(h.id)}`}
                      className="rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/25"
                    >
                      Share page
                    </Link>
                    <Link
                      href={`${href}${h.task ? `?task=${encodeURIComponent(h.task)}` : ""}#buy`}
                      className="rounded-full bg-amber-400/15 px-3.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
                    >
                      Hire again
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
