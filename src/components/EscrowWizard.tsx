"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { decodeEventLog, formatEther, formatUnits } from "viem";
import type { CategoryId } from "@/lib/categories";
import {
  encodeFund,
  encodeRegisterJob,
  encodeSetBudget,
  ERC8183_MAINNET,
  escrowNetworkLabel,
  JOB_CREATED_EVENT,
  minBnbFor,
  nativeSymbolFor,
} from "@/lib/erc8183-escrow";
import type { HireJob } from "@/lib/hire-engine";
import { ESCROW_CTA, ESCROW_LINE, NEVER_PAY_SELLER } from "@/lib/copy";
import { shortWallet } from "@/lib/demo-pay";
import {
  discoverWallets,
  getChainId,
  isUserRejected,
  requestAccounts,
  sendContractTx,
  switchToBsc,
  waitForReceipt,
  type DiscoveredWallet,
  type EthProvider,
} from "@/lib/wallet-pay";

type QuoteData = {
  chainId: number;
  addresses: typeof ERC8183_MAINNET;
  provider: {
    address: `0x${string}`;
    label: string;
    role: string;
    note: string;
  };
  budgetU: string;
  budgetWei: string;
  tokenSymbol: string;
  tokenDecimals: number;
  predictedJobId: string;
  disputeWindowSeconds: number;
  deadlineSeconds?: number;
  estimatedGasBnb: string;
  minBnb: string;
  wallet: {
    address: string;
    uBalanceWei: string;
    uAllowanceWei: string;
    bnbWei: string;
    needsApprove: boolean;
    enoughU: boolean;
  } | null;
  calls: {
    approve: { to: `0x${string}`; data: `0x${string}` };
    createJob: { to: `0x${string}`; data: `0x${string}` };
  };
};

type Step =
  | "connect"
  | "balances"
  | "approve"
  | "fund"
  | "notify"
  | "done";

type Props = {
  open: boolean;
  onClose: () => void;
  chainId: number;
  tokenId: string;
  agentName: string;
  categoryId?: CategoryId | null;
  genesisSlug?: string;
  ownerAddress?: string;
  task: string;
  /** Listing chainId stays 56 for ERC-8004 identity. Escrow is always BSC 56. */
  escrowChainId?: number;
  /** Card price line, e.g. "SKU $6" or "0.1 $U". */
  listLabel?: string;
};

function explain(
  e: unknown,
  kind: "gas" | "token" | "tx",
  chainId: number,
): string {
  if (isUserRejected(e)) return "You rejected the transaction in the wallet.";
  const msg = e instanceof Error ? e.message : String(e);
  const net = escrowNetworkLabel(chainId);
  const gas = nativeSymbolFor(chainId);
  if (/insufficient funds|insufficient balance/i.test(msg)) {
    return kind === "gas"
      ? `Insufficient ${gas} for gas on ${net}.`
      : "Insufficient $U for this job.";
  }
  if (/chain|network/i.test(msg)) {
    return `Wrong network. Switch to ${net} (BSC mainnet, chain 56).`;
  }
  return msg || "Transaction failed";
}

function formatDuration(sec: number): string {
  if (sec >= 86400) return `${Math.round(sec / 86400)}d`;
  if (sec >= 3600) return `${Math.round(sec / 3600)}h`;
  return `${Math.max(1, Math.round(sec / 60))}m`;
}

function parseCreatedJobId(
  logs: { address?: string; topics?: string[]; data?: string }[],
  commerce: string,
): string | null {
  for (const log of logs) {
    if (
      log.address &&
      log.address.toLowerCase() !== commerce.toLowerCase()
    ) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: [JOB_CREATED_EVENT],
        data: (log.data || "0x") as `0x${string}`,
        topics: (log.topics || []) as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName === "JobCreated") {
        const args = decoded.args as { jobId?: bigint };
        if (args.jobId != null) return args.jobId.toString();
      }
    } catch {
      /* next */
    }
  }
  return null;
}

export function EscrowWizard({
  open,
  onClose,
  chainId,
  tokenId,
  agentName,
  categoryId,
  genesisSlug,
  ownerAddress,
  task,
  escrowChainId,
  listLabel,
}: Props) {
  const router = useRouter();
  void escrowChainId;
  const railChain = 56 as const;
  const netLabel = escrowNetworkLabel(railChain);
  const gasSymbol = nativeSymbolFor(railChain);
  const [step, setStep] = useState<Step>("connect");
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [provider, setProvider] = useState<EthProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const sessionRef = useRef(0);

  const brief = task.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleClose() {
    sessionRef.current += 1;
    setBusy(false);
    setError(null);
    setStep("connect");
    setAddress(null);
    setProvider(null);
    setQuote(null);
    setLog([]);
    setOnchainJobId(null);
    onClose();
  }

  function disconnectWallet() {
    sessionRef.current += 1;
    const session = sessionRef.current;
    setBusy(false);
    setError(null);
    setAddress(null);
    setProvider(null);
    setLog([]);
    setOnchainJobId(null);
    setStep("connect");
    void loadQuote(undefined)
      .then((q) => {
        if (session !== sessionRef.current) return;
        setQuote(q);
      })
      .catch((e) => {
        if (session !== sessionRef.current) return;
        setQuote(null);
        setError(e instanceof Error ? e.message : "Could not load escrow quote");
      });
    void discoverWallets().then((found) => {
      if (session !== sessionRef.current) return;
      setWallets(found);
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const session = sessionRef.current;
    setError(null);
    setQuote(null);
    void discoverWallets().then((found) => {
      if (session !== sessionRef.current) return;
      setWallets(found);
    });
    void loadQuote(address || undefined)
      .then((q) => {
        if (session !== sessionRef.current) return;
        setQuote(q);
      })
      .catch((e) => {
        if (session !== sessionRef.current) return;
        setError(e instanceof Error ? e.message : "Could not load escrow quote");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, railChain]);

  const connected = Boolean(address && quote?.wallet);
  const enoughU = Boolean(quote?.wallet?.enoughU);
  const enoughBnb = useMemo(() => {
    if (!quote?.wallet) return false;
    const floor = quote.minBnb || minBnbFor(railChain);
    return BigInt(quote.wallet.bnbWei) >= parseEtherSafe(floor);
  }, [quote, railChain]);

  function push(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function loadQuote(wallet?: string) {
    const res = await fetch("/api/escrow/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genesisSlug,
        chainId,
        tokenId,
        ownerAddress,
        task: brief,
        wallet: wallet || undefined,
        escrowChainId: railChain,
      }),
    });
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      data?: QuoteData;
    };
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error || "Escrow quote failed");
    }
    return json.data;
  }

  function tokenShort(q: QuoteData): string {
    const token = q.addresses.paymentToken;
    return `${token.slice(0, 8)}…`;
  }

  function insufficientUMessage(q: QuoteData): string {
    return `This wallet has no $U on BSC mainnet. Escrow locks ${q.budgetU} $U at ${tokenShort(q)}. Get plan is free and does not need $U.`;
  }

  async function connect(w: DiscoveredWallet) {
    const session = sessionRef.current;
    setBusy(true);
    setError(null);
    try {
      const addr = await requestAccounts(w.provider);
      if (session !== sessionRef.current) return;
      const chain = await getChainId(w.provider);
      if (session !== sessionRef.current) return;
      if (chain !== railChain) {
        push(`Wrong network — switching to ${netLabel}…`);
        await switchToBsc(w.provider);
      }
      if (session !== sessionRef.current) return;
      setProvider(w.provider);
      setAddress(addr);
      const q = await loadQuote(addr);
      if (session !== sessionRef.current) return;
      setQuote(q);
      setError(null);
      setStep("balances");
    } catch (e) {
      if (session !== sessionRef.current) return;
      setError(explain(e, "tx", railChain));
    } finally {
      if (session === sessionRef.current) setBusy(false);
    }
  }

  async function send(
    eth: EthProvider,
    from: string,
    call: { to: string; data: string },
    label: string,
  ) {
    push(`${label}…`);
    const hash = await sendContractTx(eth, {
      from,
      to: call.to,
      data: call.data,
      chainId: railChain,
    });
    push(`${label} tx ${hash.slice(0, 10)}…`);
    const rec = await waitForReceipt(eth, hash);
    if (rec.status !== "0x1") throw new Error(`${label} reverted`);
    return { hash, rec };
  }

  async function runFund() {
    if (!provider || !address || !quote) return;
    const session = sessionRef.current;
    setBusy(true);
    setError(null);
    try {
      const chain = await getChainId(provider);
      if (session !== sessionRef.current) return;
      if (chain !== railChain) {
        await switchToBsc(provider);
      }
      if (session !== sessionRef.current) return;

      const q = await loadQuote(address);
      if (session !== sessionRef.current) return;
      setQuote(q);
      if (!q.wallet?.enoughU) {
        throw new Error(insufficientUMessage(q));
      }
      const floor = q.minBnb || minBnbFor(railChain);
      if (BigInt(q.wallet.bnbWei) < parseEtherSafe(floor)) {
        throw new Error(`Insufficient ${gasSymbol} for gas on ${netLabel}.`);
      }

      let approveTx: `0x${string}` | undefined;
      if (q.wallet.needsApprove) {
        setStep("approve");
        const sent = await send(provider, address, q.calls.approve, "Approve $U");
        approveTx = sent.hash;
      }

      setStep("fund");
      const created = await send(
        provider,
        address,
        q.calls.createJob,
        "Create escrow job",
      );
      let createdId =
        parseCreatedJobId(created.rec.logs, q.addresses.commerce) ||
        q.predictedJobId;
      const check = await fetch(
        `/api/escrow/status?onchainJobId=${encodeURIComponent(createdId)}&chainId=${railChain}`,
      );
      const checked = (await check.json()) as {
        success?: boolean;
        data?: { chain?: { client?: string } };
      };
      const client = checked.data?.chain?.client || "";
      if (client && client.toLowerCase() !== address.toLowerCase()) {
        throw new Error(
          "Could not confirm the new on-chain job id for this wallet. Retry — a concurrent create may have raced.",
        );
      }
      setOnchainJobId(createdId);

      const jobIdBig = BigInt(createdId);
      const amount = BigInt(q.budgetWei);
      await send(
        provider,
        address,
        encodeRegisterJob(jobIdBig, railChain),
        "Register policy",
      );
      await send(
        provider,
        address,
        encodeSetBudget(jobIdBig, amount, railChain),
        "Set budget",
      );
      const funded = await send(
        provider,
        address,
        encodeFund(jobIdBig, amount, railChain),
        "Fund escrow",
      );

      setStep("notify");
      push("Notifying seller…");
      const persist = await fetch("/api/escrow/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genesisSlug,
          chainId,
          tokenId,
          agentName,
          categoryId,
          task: brief,
          wallet: address,
          onchainJobId: createdId,
          fundTx: funded.hash,
          createTx: created.hash,
          approveTx,
          budgetUsd: q.budgetU,
          escrowChainId: railChain,
        }),
      });
      const saved = (await persist.json()) as {
        success: boolean;
        error?: string;
        sharePath?: string;
        data?: HireJob;
        notify?: { ok?: boolean; error?: string };
      };
      if (!persist.ok || !saved.success || !saved.sharePath) {
        throw new Error(saved.error || "Could not save the escrow receipt");
      }
      if (saved.data) {
        try {
          const prev = JSON.parse(
            localStorage.getItem("genesis-hires") || "[]",
          ) as HireJob[];
          const next = [
            saved.data,
            ...prev.filter((j) => j.id !== saved.data!.id),
          ].slice(0, 30);
          localStorage.setItem("genesis-hires", JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      if (saved.notify && saved.notify.ok === false) {
        push(`Seller notify: ${saved.notify.error || "timeout"} — receipt still saved.`);
      }
      setStep("done");
      router.push(saved.sharePath);
    } catch (e) {
      if (session !== sessionRef.current) return;
      setError(explain(e, step === "approve" ? "token" : "gas", railChain));
      setStep(address ? "balances" : "connect");
    } finally {
      if (session === sessionRef.current) setBusy(false);
    }
  }

  async function watchUToken() {
    if (!provider || !quote) return;
    try {
      await provider.request({
        method: "wallet_watchAsset",
        params: [
          {
            type: "ERC20",
            options: {
              address: quote.addresses.paymentToken,
              symbol: "U",
              decimals: quote.tokenDecimals || 18,
            },
          },
        ],
      });
    } catch {
      /* wallet may not support watchAsset */
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-black/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[min(92dvh,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#121214] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="escrow-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
              On-chain escrow · BSC 56
            </p>
            <h2
              id="escrow-wizard-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              {agentName}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/50">
              {ESCROW_LINE}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close hire panel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xl leading-none text-white hover:bg-white/20"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">

        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-50/90">
          {ESCROW_CTA}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-rose-200/90">
          {NEVER_PAY_SELLER}
        </p>

        {error && (
          <div className="mt-3 space-y-2 rounded-lg bg-rose-500/15 px-3 py-3">
            <p className="text-xs text-rose-200">{error}</p>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white"
            >
              Close
            </button>
          </div>
        )}

        <ol className="mt-4 flex flex-wrap gap-1">
          {[
            { id: "connect", label: "1 Connect" },
            { id: "approve", label: "2 Approve $U" },
            { id: "fund", label: "3 Fund escrow" },
            { id: "notify", label: "4 Notify seller" },
            { id: "done", label: "5 Receipt" },
          ].map((s) => (
            <li
              key={s.id}
              className={`rounded-full px-2 py-0.5 text-[9px] ${
                step === s.id
                  ? "bg-amber-400 text-black"
                  : "bg-white/8 text-white/50"
              }`}
            >
              {s.label}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
          Approve $U to the ERC-8183 kernel, then fund. The seller address is
          the escrow counterparty — not a pay-to. After fund you land on{" "}
          <code className="text-white/60">/jobs/&lt;id&gt;</code> to approve
          payout or dispute.
        </p>

        {address && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="font-mono text-[12px] text-white/80">
              {shortWallet(address)}
              <span className="ml-2 font-sans text-[11px] text-white/40">
                connected
              </span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => disconnectWallet()}
              className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:border-white/40 hover:text-white disabled:opacity-40"
            >
              Sign out
            </button>
          </div>
        )}

        {step === "connect" && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-white/50">
              Connect a wallet on {netLabel} (chain {railChain}) to read $U
              and sign. We do not know your balance until you connect.
            </p>
            {wallets.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-white/55">
                No injected wallet in this browser. Preview below is the lock
                size, not your balance. Install MetaMask, Binance Wallet, or
                another EIP-6963 wallet on chain {railChain}, then reopen.
              </p>
            )}
            {wallets.map((w) => (
              <button
                key={w.uuid}
                type="button"
                disabled={busy}
                onClick={() => void connect(w)}
                className="flex w-full items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-left text-sm text-white hover:border-amber-400/40 disabled:opacity-40"
              >
                {w.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.icon} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <span className="h-5 w-5 rounded bg-amber-400/30" />
                )}
                {w.name}
              </button>
            ))}
          </div>
        )}

        {quote && (
          <div className="mt-4 space-y-3 text-[12px] text-white/60">
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              {listLabel ? (
                <p className="text-[11px] leading-relaxed text-white/55">
                  {listLabel} is Get plan (no charge). Optional escrow locks{" "}
                  <span className="font-semibold text-white">
                    {quote.budgetU} $U
                  </span>{" "}
                  in the kernel.
                </p>
              ) : (
                <p>
                  Lock{" "}
                  <span className="font-semibold text-white">
                    {quote.budgetU} {quote.tokenSymbol}
                  </span>{" "}
                  in the ERC-8183 kernel.
                </p>
              )}
              <p className="mt-1 font-mono text-[10px] text-white/40 break-all">
                Kernel {quote.addresses.commerce}
              </p>
              <p className="mt-1 font-mono text-[10px] text-white/40 break-all">
                $U {quote.addresses.paymentToken}
              </p>
              <p className="mt-2 text-[11px] text-white/50">
                Counterparty (seller identity, not a pay-to):{" "}
                <span className="font-mono text-white/70">
                  {quote.provider.address.slice(0, 8)}…{quote.provider.address.slice(-4)}
                </span>{" "}
                · {quote.provider.label}
              </p>
            </div>
            {connected ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] text-white/40">Your $U</div>
                  <div className="font-semibold text-white">
                    {formatUnits(BigInt(quote.wallet!.uBalanceWei), quote.tokenDecimals)}
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] text-white/40">Your BNB (gas)</div>
                  <div className="font-semibold text-white">
                    {formatEther(BigInt(quote.wallet!.bnbWei))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-white/45">
                Lock size is {quote.budgetU} $U. Your $U balance is unknown
                until a wallet is connected.
              </p>
            )}
            <p className="text-[10px] text-white/40">
              Escrow locks {quote.budgetU} $U + ~{quote.estimatedGasBnb}{" "}
              {gasSymbol} gas (keep ≥ {quote.minBnb} {gasSymbol}). Submit the
              plan hash within{" "}
              {formatDuration(quote.deadlineSeconds || 604800)} of fund.
              Dispute window {formatDuration(quote.disputeWindowSeconds)} after
              submit.
            </p>
            {connected && !enoughU && (
              <div className="space-y-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2">
                <p className="text-xs text-amber-50/90">
                  {insufficientUMessage(quote)}
                </p>
                {provider ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void watchUToken()}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/85"
                  >
                    Add $U token to wallet
                  </button>
                ) : null}
              </div>
            )}
            {connected && !enoughBnb && (
              <p className="text-xs text-rose-200">
                This wallet needs more {gasSymbol} for gas on BSC mainnet.
              </p>
            )}
          </div>
        )}

        {step !== "connect" && step !== "done" && (
          <button
            type="button"
            disabled={
              busy || !connected || !enoughU || !enoughBnb || brief.length <= 8
            }
            onClick={() => void runFund()}
            className="btn-primary mt-3 w-full disabled:opacity-40"
          >
            {busy
              ? step === "approve"
                ? "Approving $U…"
                : step === "fund"
                  ? "Funding escrow…"
                  : step === "notify"
                    ? "Notifying seller…"
                    : "Working…"
              : quote?.wallet?.needsApprove
                ? "Approve $U and fund escrow"
                : "Fund escrow"}
          </button>
        )}

        {onchainJobId && (
          <p className="mt-2 font-mono text-[10px] text-white/40">
            on-chain job {onchainJobId}
          </p>
        )}

        {log.length > 0 && (
          <ol className="mt-3 space-y-1 text-[10px] text-white/45">
            {log.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ol>
        )}
        </div>
        <div className="shrink-0 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 w-full rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Close · use Get plan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function parseEtherSafe(v: string): bigint {
  const [w, f = ""] = v.split(".");
  const frac = (f + "000000000000000000").slice(0, 18);
  return BigInt(w || "0") * BigInt(10) ** BigInt(18) + BigInt(frac || "0");
}
