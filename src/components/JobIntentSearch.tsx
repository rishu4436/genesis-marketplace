"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  JOB_CHIPS,
  matchAgentsForJob,
  type MatchedAgent,
} from "@/lib/intent-match";
import { loadBuyerContext } from "@/lib/buyer-context";

type Props = {
  variant?: "hero" | "page";
};

type OrchPick = {
  slug: string;
  name: string;
  score: number;
  why: string;
  buyHref: string;
  priceUsd: number;
  etaMinutes: number;
};

type OrchData = {
  ai: boolean;
  rewrittenBrief: string;
  picks: OrchPick[];
  planOfAttack: string[];
  risks: string[];
  nextAction: string;
  intent?: { summary: string; urgency: string; capitalAtRisk: string };
  fallbackReason?: string;
};

export function JobIntentSearch({ variant = "hero" }: Props) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [loading, setLoading] = useState(false);
  const [orch, setOrch] = useState<OrchData | null>(null);

  const localResult = useMemo(() => {
    if (!submitted.trim() || orch) return null;
    return matchAgentsForJob(submitted, 3);
  }, [submitted, orch]);

  async function run(query: string) {
    const t = query.trim();
    if (!t) return;
    setQ(t);
    setSubmitted(t);
    setOrch(null);
    setLoading(true);
    try {
      const buyerContext = loadBuyerContext();
      const res = await fetch("/api/ai/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: t, buyerContext }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: OrchData;
      };
      if (json.success && json.data) {
        setOrch(json.data);
      }
    } catch {
      /* local match still available */
    } finally {
      setLoading(false);
    }
  }

  const picks = orch?.picks;
  const localMatches = localResult?.matches;

  return (
    <div
      className={
        variant === "hero"
          ? "w-full max-w-2xl"
          : "w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      }
    >
      <label className="block">
        <span
          className={
            variant === "hero"
              ? "sr-only"
              : "text-xs font-semibold uppercase tracking-[0.12em] text-white/40"
          }
        >
          What do you need done?
        </span>
        <div className="mt-0 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run(q);
            }}
            placeholder="e.g. Protect my Venus HF after a 15% dump…"
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-amber-400/30 placeholder:text-white/35 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => run(q)}
            disabled={loading}
            className="btn-primary shrink-0 !rounded-full !px-5 !py-3 !text-sm disabled:opacity-50"
          >
            {loading ? "Thinking…" : "AI match"}
          </button>
        </div>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        {JOB_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => run(c.task)}
            className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/65 transition hover:border-amber-400/35 hover:text-amber-100"
          >
            {c.label}
          </button>
        ))}
      </div>

      {(orch || localMatches) && (
        <div className="mt-5 space-y-3">
          {orch?.ai && (
            <p className="text-xs text-emerald-300/90">
              Grok orchestration ·{" "}
              {orch.intent?.urgency || "medium"} urgency
              {orch.intent?.capitalAtRisk
                ? ` · capital ${orch.intent.capitalAtRisk}`
                : ""}
            </p>
          )}
          {!orch?.ai && submitted && !loading && (
            <p className="text-xs text-white/40">
              Rules match
              {orch?.fallbackReason
                ? ` (${orch.fallbackReason})`
                : " — add XAI_API_KEY for Grok ranking"}
            </p>
          )}

          {orch?.rewrittenBrief && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-[11px] text-amber-50/90">
              <span className="font-semibold text-amber-200">Optimized brief: </span>
              {orch.rewrittenBrief}
            </div>
          )}

          {(picks || localMatches || []).map((m) => {
            if ("agent" in (m as MatchedAgent)) {
              const mm = m as MatchedAgent;
              return (
                <Link
                  key={mm.agent.slug}
                  href={`${mm.buyHref.split("#")[0]}?task=${encodeURIComponent(localResult?.normalizedTask || q)}&buy=1#buy`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/35"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {mm.agent.name}
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      {mm.reasons.join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black">
                    Buy · ${mm.agent.basePriceUsd}
                  </span>
                </Link>
              );
            }
            const p = m as OrchPick;
            return (
              <Link
                key={p.slug}
                href={p.buyHref}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/35"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {p.name}
                    </span>
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {p.score}/100
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/50">{p.why}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black">
                  Buy · ${p.priceUsd}
                </span>
              </Link>
            );
          })}

          {orch?.planOfAttack && orch.planOfAttack.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Plan of attack
              </p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11px] text-white/55">
                {orch.planOfAttack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
