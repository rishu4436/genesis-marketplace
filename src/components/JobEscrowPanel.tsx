"use client";

import { useEffect, useMemo, useState } from "react";
import type { HireJob } from "@/lib/hire-engine";
import { bscscanAddress, bscscanTx, escrowUiPhase } from "@/lib/erc8183-escrow";
import { ESCROW_LINE, NEVER_PAY_SELLER } from "@/lib/copy";
import {
  discoverWallets,
  getChainId,
  isUserRejected,
  requestAccounts,
  sendContractTx,
  switchToBsc,
  waitForReceipt,
} from "@/lib/wallet-pay";


const PHASES = [
  "quoted",
  "funded",
  "working",
  "delivered",
  "dispute-window",
  "settled",
  "disputed",
] as const;

const PHASE_LABEL: Record<string, string> = {
  quoted: "Quoted",
  funded: "Escrow funded",
  working: "Working",
  delivered: "Delivered",
  "dispute-window": "Dispute window",
  settled: "Settled",
  disputed: "Disputed",
  expired: "Expired",
};

type StatusPayload = {
  chain: {
    id: string;
    statusName: string;
    submittedAt: number;
    expiredAt: number;
    budget: string;
  };
  phase: string;
  hasPayload: boolean;
  disputeWindowSeconds: number;
  windowEnd: number;
  inWindow: boolean;
  canDispute: boolean;
  canApprove: boolean;
  canRefund: boolean;
};

export function JobEscrowPanel({ job }: { job: HireJob }) {
  const escrow = job.escrow;
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const hasPayload = Boolean(
    job.deliverable?.title?.trim() &&
      job.deliverable?.summary?.trim() &&
      (job.deliverable.sections?.length || 0) > 0,
  );

  useEffect(() => {
    if (!escrow?.onchainJobId) return;
    let stop = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/escrow/status?jobId=${encodeURIComponent(job.id)}&onchainJobId=${escrow!.onchainJobId}`,
        );
        const json = (await res.json()) as {
          success: boolean;
          data?: StatusPayload;
          error?: string;
        };
        if (!stop && json.success && json.data) setStatus(json.data);
        if (!stop && json.error) setError(json.error);
      } catch (e) {
        if (!stop) {
          setError(e instanceof Error ? e.message : "Status failed");
        }
      }
    }
    void load();
    const t = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
      void load();
    }, 20_000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [job.id, escrow?.onchainJobId]);

  const phase = status?.phase ||
    escrowUiPhase({
      chainStatus: escrow?.chainStatus,
      hasPayload,
      submittedAt: escrow?.submittedAt,
      disputeWindowSeconds: escrow?.disputeWindowSeconds,
      nowSec: now,
    });

  const remaining = useMemo(() => {
    const end = status?.windowEnd || 0;
    if (!end) return "";
    const s = Math.max(0, end - now);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }, [status?.windowEnd, now]);

  if (!escrow) return null;
  const record = escrow;

  async function settle(action: "approve" | "dispute" | "refund") {
    setBusy(true);
    setError(null);
    try {
      const prep = await fetch("/api/escrow/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, action }),
      });
      const pre = (await prep.json()) as {
        success: boolean;
        error?: string;
        data?: { call: { to: string; data: string }; note?: string };
      };
      if (!pre.success || !pre.data?.call) {
        throw new Error(pre.error || "Could not encode settle call");
      }
      const found = await discoverWallets();
      if (found.length === 0) throw new Error("Connect a wallet first");
      const eth = found[0].provider;
      const addr = await requestAccounts(eth);
      if (record.buyer && addr.toLowerCase() !== record.buyer.toLowerCase()) {
        throw new Error("Connect the wallet that funded this escrow");
      }
      const chain = await getChainId(eth);
      if (chain !== 56) await switchToBsc(eth);
      const hash = await sendContractTx(eth, {
        from: addr,
        to: pre.data.call.to,
        data: pre.data.call.data,
      });
      const rec = await waitForReceipt(eth, hash);
      if (rec.status !== "0x1") throw new Error("Settle transaction reverted");
      await fetch("/api/escrow/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, action, txHash: hash }),
      });
      window.location.reload();
    } catch (e) {
      setError(
        isUserRejected(e)
          ? "You rejected the transaction in the wallet."
          : e instanceof Error
            ? e.message
            : "Settle failed",
      );
    } finally {
      setBusy(false);
    }
  }

  const canApprove = status?.canApprove === true;
  const canDispute = status?.canDispute === true;

  return (
    <section className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
          ERC-8183 escrow
        </p>
        <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100">
          {PHASE_LABEL[phase] || phase}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-white/55">{ESCROW_LINE}</p>
      <p className="mt-1 text-[11px] font-semibold text-rose-200/85">
        {NEVER_PAY_SELLER}
      </p>

      <ol className="mt-3 flex flex-wrap gap-1">
        {PHASES.map((p) => {
          const on = PHASES.indexOf(p) <= PHASES.indexOf(phase as (typeof PHASES)[number]);
          return (
            <li
              key={p}
              className={`rounded-full px-2 py-0.5 text-[9px] ${
                p === phase
                  ? "bg-amber-400 text-black"
                  : on
                    ? "bg-white/10 text-white/70"
                    : "bg-white/5 text-white/30"
              }`}
            >
              {PHASE_LABEL[p]}
            </li>
          );
        })}
      </ol>

      <dl className="mt-3 grid gap-2 text-[11px] text-white/55 sm:grid-cols-2">
        <div>
          <dt className="text-white/35">Amount</dt>
          <dd className="mt-0.5 font-semibold text-white">
            {escrow.amountU} {escrow.tokenSymbol}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">On-chain job</dt>
          <dd className="mt-0.5 font-mono">{escrow.onchainJobId}</dd>
        </div>
        <div>
          <dt className="text-white/35">Kernel (escrow)</dt>
          <dd className="mt-0.5">
            <a
              href={bscscanAddress(escrow.commerce)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-amber-300 hover:underline"
            >
              {escrow.commerce.slice(0, 8)}…{escrow.commerce.slice(-4)}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Counterparty (identity)</dt>
          <dd className="mt-0.5 font-mono text-white/70">
            {escrow.provider.slice(0, 8)}…{escrow.provider.slice(-4)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {escrow.fundTx && (
          <a
            href={bscscanTx(escrow.fundTx)}
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 hover:underline"
          >
            Fund tx ↗
          </a>
        )}
        {escrow.settleTx && (
          <a
            href={bscscanTx(escrow.settleTx)}
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 hover:underline"
          >
            Settle tx ↗
          </a>
        )}
        {escrow.disputeTx && (
          <a
            href={bscscanTx(escrow.disputeTx)}
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 hover:underline"
          >
            Dispute tx ↗
          </a>
        )}
      </div>

      {phase === "working" && !hasPayload && (
        <p className="mt-3 text-[11px] text-amber-100/80">
          Escrow is funded. Awaiting a deliverable — this is not Delivered.
        </p>
      )}
      {phase === "dispute-window" && (
        <p className="mt-3 text-[11px] text-white/55">
          Dispute window open{remaining ? ` · ${remaining} left` : ""}. Approve
          payout is disabled until the window ends (chain reverts if early).
        </p>
      )}
      {status && phase === "delivered" && !status.canApprove && (
        <p className="mt-3 text-[11px] text-white/45">
          On-chain submit seen. Approve becomes available after the dispute window.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !canApprove}
          title={
            canApprove
              ? "Release escrow to the provider after the window"
              : "Approve is disabled until the dispute window ends"
          }
          onClick={() => void settle("approve")}
          className="rounded-full bg-[#F0B90B] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          Approve payout
        </button>
        <button
          type="button"
          disabled={busy || !canDispute}
          title={
            canDispute
              ? "Dispute inside the window"
              : "Dispute is only valid inside the window after submit"
          }
          onClick={() => void settle("dispute")}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 disabled:opacity-40"
        >
          Dispute
        </button>
      </div>
    </section>
  );
}
