"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryId } from "@/lib/categories";
import { defaultTaskForCategory, taskTemplatesFor } from "@/lib/hire";
import type { HireJob } from "@/lib/hire-engine";
import { getCategoryDepth } from "@/lib/category-depth";
import {
  commerceModesForAgent,
  defaultRail,
  type CommerceRail,
} from "@/lib/commerce";
import { BuyerContextPanel } from "@/components/BuyerContextPanel";
import type { BuyerContext } from "@/lib/buyer-context";
import { SignInForm } from "@/components/SignInForm";
import { HirePartnerFollowup } from "@/components/HirePartnerFollowup";
import { ESCROW_STANCE } from "@/lib/escrow-stance";
import { ESCROW_CTA, ESCROW_LINE, SOFT_HIRE_SHORT } from "@/lib/copy";
import { hasLivePayload, jobOutcome } from "@/lib/job-outcome";
import { resolveEscrowProvider } from "@/lib/erc8183-escrow";
import { EscrowWizard } from "@/components/EscrowWizard";

type Props = {
  chainId: number;
  tokenId: string;
  agentName: string;
  categoryId?: CategoryId | null;
  genesisSlug?: string;
  hireReady?: boolean;
  priceUsd?: number;
  etaMinutes?: number;
  /** Seller lists x402 */
  x402?: boolean;
};

function persistJobLocal(job: HireJob) {
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

type Phase = "idle" | "buying" | "working" | "done";

export function HireWizard({
  chainId,
  tokenId,
  agentName,
  categoryId,
  genesisSlug,
  hireReady,
  priceUsd = 10,
  etaMinutes = 2,
  x402 = false,
}: Props) {
  const isHireReady = hireReady ?? Boolean(genesisSlug);
  const templates = useMemo(
    () => taskTemplatesFor(categoryId).slice(0, 3),
    [categoryId],
  );
  const sample = categoryId ? getCategoryDepth(categoryId) : null;
  const modes = useMemo(
    () =>
      commerceModesForAgent({
        x402,
        hireReady: isHireReady,
        escrowAvailable: ESCROW_STANCE.available,
      }),
    [x402, isHireReady],
  );

  const briefKey = `genesis-last-brief:${genesisSlug || `${chainId}:${tokenId}`}`;
  const [task, setTask] = useState(() => defaultTaskForCategory(categoryId));
  const [rail, setRail] = useState<CommerceRail>(() => defaultRail(modes));
  const [buyerCtx, setBuyerCtx] = useState<BuyerContext | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<HireJob | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [escrowOpen, setEscrowOpen] = useState(false);
  const autobuyStarted = useRef(false);
  const escrowProvider = useMemo(
    () =>
      resolveEscrowProvider({
        genesisSlug,
        chainId,
        tokenId,
      }),
    [genesisSlug, chainId, tokenId],
  );
  const escrowOk = ESCROW_STANCE.available && Boolean(escrowProvider);

  const canBuy = useMemo(() => task.trim().length > 8, [task]);
  const displayPrice = priceUsd > 0 ? priceUsd : 10;
  const displayEta = etaMinutes > 0 ? etaMinutes : 2;
  const loading = phase === "buying" || phase === "working";

  function startHire() {
    const brief = task.trim();
    if (brief.length <= 8) {
      setError("Add a short job brief first");
      return;
    }
    setError(null);
    // Soft hire is the default. Escrow is a separate in-app wizard.
    void buyAgent(brief);
  }

  async function buyAgent(taskOverride?: string) {
    const brief = (taskOverride ?? task).trim();
    if (brief.length <= 8) {
      setError("Add a short job brief first");
      return;
    }
    setPhase("buying");
    setError(null);
    setSharePath(null);
    const workTimer = window.setTimeout(() => setPhase("working"), 450);
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
          task: brief,
          budgetUsd: String(displayPrice),
          duration: "once",
          risk: buyerCtx?.risk === "conservative" ? "low" : buyerCtx?.risk === "aggressive" ? "high" : "medium",
          notes: `tier:${rail}`,
          autoFulfill: true,
          tier: rail === "free" ? "free" : "full",
          buyerContext: rail === "free" ? null : buyerCtx,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: HireJob;
        sharePath?: string;
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Hire failed");
      }
      setJob(json.data);
      persistJobLocal(json.data);
      try {
        localStorage.setItem(briefKey, brief);
      } catch {
        /* ignore */
      }
      setSharePath(json.sharePath || `/jobs/${encodeURIComponent(json.data.id)}`);
      // Best-effort dual persist
      try {
        await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: json.data }),
        });
      } catch {
        /* ok */
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hire failed");
      setPhase("idle");
    } finally {
      window.clearTimeout(workTimer);
    }
  }

  // Prefill ?task= ; ?buy=1 starts hire immediately (judge cold path)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = (sp.get("task") || "").trim();
      if (t.length > 8) setTask(t);
      else {
        const saved = localStorage.getItem(briefKey);
        if (saved && saved.trim().length > 8) setTask(saved);
      }
      if (sp.get("escrow") === "1") {
        setEscrowOpen(true);
      }
      if (sp.get("buy") === "1" && !autobuyStarted.current) {
        autobuyStarted.current = true;
        const brief = t.length > 8 ? t : defaultTaskForCategory(categoryId);
        void buyAgent(brief);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyResult() {
    if (!job?.deliverable) return;
    const d = job.deliverable;
    const text = [
      d.title,
      d.summary,
      "",
      ...d.sections.map((s) => `## ${s.heading}\n${s.body}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function copyShareLink() {
    if (!sharePath && !job) return;
    const path = sharePath || `/jobs/${encodeURIComponent(job!.id)}`;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (job && phase === "done") {
    const d = job.deliverable;
    const paid = job.quote?.priceUsd ?? displayPrice;
    const path = sharePath || `/jobs/${encodeURIComponent(job.id)}`;
    const complete = hasLivePayload(job) && job.status === "delivered";
    const outcome = jobOutcome(job);
    return (
      <div id="buy" className="space-y-3 scroll-mt-28">
        <div
          className={`rounded-2xl border p-5 shadow-lg ${
            complete
              ? "border-emerald-400/30 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 shadow-emerald-900/10"
              : "border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-amber-500/5 shadow-amber-900/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                complete
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-amber-400/15 text-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  complete ? "bg-emerald-400" : "bg-amber-300"
                }`}
              />
              {outcome.label}
            </div>
            <span className="text-[11px] font-medium text-white/40">
              {outcome.hint}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">
            {d?.title || `${agentName} result`}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {d?.summary}
          </p>
          {d?.sections[0] && (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-black/25 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                What to do now
              </p>
              <p className="mt-1 text-xs font-semibold text-white">
                {d.sections[0].heading}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                {d.sections[0].body}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-amber-400/25 bg-black/30 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">
              Where you receive this
            </p>
            <p className="mt-1 font-mono text-lg font-bold tracking-widest text-white">
              {job.claimCode || job.id}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50">
              This plan lives at the result page. Sign in below so My hires
              shows it on another browser. Or keep this claim code / result
              link.
            </p>
          </div>

          <div className="mt-3">
            <SignInForm
              jobId={job.id}
              defaultMode="signup"
              title="Keep this agent on your account"
              hint="Create an account so My hires shows this plan on any phone. Guest copy stays in this browser."
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-black/25 px-2 py-2">
              <div className="text-[10px] text-white/40">SKU · L0</div>
              <div className="text-sm font-semibold text-white">
                ${paid} · no charge
              </div>
            </div>
            <div className="rounded-lg bg-black/25 px-2 py-2">
              <div className="text-[10px] text-white/40">ETA</div>
              <div className="text-sm font-semibold text-white">
                {job.quote?.etaMinutes ?? displayEta}m
              </div>
            </div>
            <div className="rounded-lg bg-black/25 px-2 py-2">
              <div className="text-[10px] text-white/40">Agent</div>
              <div className="truncate text-[11px] font-semibold text-amber-100">
                {agentName}
              </div>
            </div>
          </div>

          {d?.metrics && d.metrics.length > 0 && (
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

        <HirePartnerFollowup
          jobId={job.id}
          genesisSlug={genesisSlug}
          categoryId={categoryId}
          chainId={chainId}
          tokenId={tokenId}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <a href={path} className="btn-primary !px-4 !py-2 !text-xs">
            Open result page
          </a>
          <Link href="/dashboard" className="btn-secondary !px-4 !py-2 !text-xs">
            My hires
          </Link>
          <button
            type="button"
            onClick={copyResult}
            className="rounded-full border border-white/12 px-3 py-2 text-xs font-medium text-white/70 hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={copyShareLink}
            className="rounded-full border border-white/12 px-3 py-2 text-xs font-medium text-white/70 hover:text-white"
          >
            {linkCopied ? "Link copied" : "Share link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setJob(null);
              setPhase("idle");
              setSharePath(null);
            }}
            className="rounded-full px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80"
          >
            Hire again
          </button>
          {escrowOk && !job.escrow && (
            <button
              type="button"
              onClick={() => setEscrowOpen(true)}
              className="rounded-full border border-amber-400/30 px-3 py-2 text-xs font-medium text-amber-100 hover:border-amber-400/60"
            >
              Upgrade this job to escrow
            </button>
          )}
        </div>
        <EscrowWizard
          open={escrowOpen}
          onClose={() => setEscrowOpen(false)}
          chainId={chainId}
          tokenId={tokenId}
          agentName={agentName}
          categoryId={categoryId}
          genesisSlug={genesisSlug}
          task={job.task || task}
        />
      </div>
    );
  }

  return (
    <div
      id="buy"
      className="scroll-mt-28 rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-white/[0.03] p-5 shadow-lg shadow-amber-900/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
            Hire {agentName}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">
            Structured plan at a link + claim code. Soft hire — no custody.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            L0 · no charge
          </div>
          <div className="text-lg font-bold tabular-nums tracking-tight text-white">
            SKU ${displayPrice}
          </div>
          <div className="text-[10px] font-medium text-white/40">
            ~{displayEta} min
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-100">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-200/30 border-t-amber-200" />
            {phase === "buying" ? "Starting hire…" : "Agent is working…"}
          </div>
          <div className="mt-2 flex gap-1">
            {["Hire", "Work", "Result"].map((label, i) => {
              const step = phase === "buying" ? 0 : phase === "working" ? 1 : 2;
              const on = i <= step;
              return (
                <div key={label} className="flex flex-1 flex-col gap-1">
                  <div
                    className={`h-1 rounded-full ${
                      on ? "bg-amber-400" : "bg-white/10"
                    }`}
                  />
                  <span
                    className={`text-[9px] ${
                      on ? "text-amber-200/80" : "text-white/30"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!canBuy || loading}
        onClick={() => startHire()}
        className="btn-primary mt-4 w-full disabled:opacity-40"
      >
        {loading
          ? phase === "working"
            ? "Analyzing…"
            : "Starting…"
          : rail === "free"
            ? "Run free scan"
            : "Get plan"}
      </button>
      <p className="mt-2 text-center text-[10px] text-white/40">
        {SOFT_HIRE_SHORT}
      </p>
      <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[10px] leading-relaxed text-white/50 sm:grid-cols-2">
        <p>
          <span className="font-semibold text-white/75">L0 Soft hire</span>
          {" — "}
          plan only · you keep the keys · no custody. Listed $ is a SKU, not a
          charge.
        </p>
        <p>
          <span className="font-semibold text-white/75">L2 Escrow</span>
          {" — "}
          on-chain lock in $U · settle after deliverable · never a transfer to
          the seller.
        </p>
      </div>
      {escrowOk && (
        <>
          <button
            type="button"
            disabled={!canBuy || loading}
            onClick={() => setEscrowOpen(true)}
            className="btn-secondary mt-2 w-full disabled:opacity-40"
          >
            Hire with escrow (on-chain)
          </button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-white/45">
            {ESCROW_CTA}
          </p>
        </>
      )}

      <div className="mt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Tier
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {modes
            .filter((m) => m.available && m.rail !== "escrow")
            .map((m) => {
              const active = rail === m.rail;
              return (
                <button
                  key={m.rail}
                  type="button"
                  disabled={loading}
                  title={m.description}
                  onClick={() => {
                    setRail(m.rail);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-amber-400 text-black"
                      : "border border-white/15 bg-white/5 text-white/65 hover:border-white/25"
                  }`}
                >
                  {m.short}
                </button>
              );
            })}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
          {modes.find((m) => m.rail === rail)?.description}
        </p>
        {escrowOk && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
            {ESCROW_LINE}. Advanced notes on{" "}
            <Link href="/fund" className="text-amber-300/80 hover:underline">
              /fund
            </Link>
            .
          </p>
        )}
      </div>

      {rail !== "free" && (
        <div className="mt-3">
          <BuyerContextPanel compact onChange={setBuyerCtx} />
        </div>
      )}

      <ul className="mt-3 space-y-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[11px] text-white/55">
        <li className="flex gap-2">
          <span className="text-emerald-400">✓</span>
          {rail === "free"
            ? "Quick multi-source scan · metrics only"
            : "Multi-source analysis · thesis · checklist"}
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400">✓</span>
          {rail === "free"
            ? "0 cost · upgrade anytime"
            : "Buyer-context aware · shareable result"}
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400">✓</span>
          Agent never moves your funds
        </li>
      </ul>

      {sample && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Sample style
          </div>
          <p className="mt-1 text-[11px] leading-snug text-white/50 line-clamp-2">
            {sample.sampleOutputBody}
          </p>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Quick jobs
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {templates.map((t) => {
              const selected = task === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTask(t)}
                  disabled={loading}
                  className={`rounded-lg border px-2.5 py-2 text-left text-[11px] leading-snug transition ${
                    selected
                      ? "border-amber-400/50 bg-amber-400/15 text-amber-50"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75"
                  } disabled:opacity-50`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-xs font-medium text-white/55">
          Or write your own brief
        </span>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          disabled={loading}
          placeholder="Describe what you need…"
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2 disabled:opacity-50"
        />
      </label>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-white/35">
        You get a result page + claim code. Save it to an account, then hire
        again anytime with the same brief.
      </p>

      <EscrowWizard
        open={escrowOpen}
        onClose={() => setEscrowOpen(false)}
        chainId={chainId}
        tokenId={tokenId}
        agentName={agentName}
        categoryId={categoryId}
        genesisSlug={genesisSlug}
        task={task}
      />
    </div>
  );
}
