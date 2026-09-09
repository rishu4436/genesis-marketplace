"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeEventLog, formatEther, formatUnits } from "viem";
import type { CategoryId } from "@/lib/categories";
import {
  encodeFund,
  encodeRegisterJob,
  encodeSetBudget,
  ERC8183_MAINNET,
  JOB_CREATED_EVENT,
  MIN_BNB_BNB,
} from "@/lib/erc8183-escrow";
import type { HireJob } from "@/lib/hire-engine";
import { ESCROW_CTA, ESCROW_LINE, NEVER_PAY_SELLER } from "@/lib/copy";
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
};

function explain(e: unknown, kind: "gas" | "token" | "tx"): string {
  if (isUserRejected(e)) return "You rejected the transaction in the wallet.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/insufficient funds|insufficient balance/i.test(msg)) {
    return kind === "gas"
      ? "Insufficient BNB for gas on BSC mainnet."
      : "Insufficient $U for this job.";
  }
  if (/chain|network/i.test(msg)) {
    return "Wrong network. Switch to BNB Smart Chain (chain 56).";
  }
  return msg || "Transaction failed";
}

function parseCreatedJobId(
  logs: { address?: string; topics?: string[]; data?: string }[],
): string | null {
  for (const log of logs) {
    if (
      log.address &&
      log.address.toLowerCase() !== ERC8183_MAINNET.commerce.toLowerCase()
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
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("connect");
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [provider, setProvider] = useState<EthProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);

  const brief = task.trim();

  useEffect(() => {
    if (!open) return;
    setError(null);
    void discoverWallets().then(setWallets);
    void loadQuote().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load escrow quote"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const enoughBnb = useMemo(() => {
    if (!quote?.wallet) return false;
    return BigInt(quote.wallet.bnbWei) >= parseEtherSafe(MIN_BNB_BNB);
  }, [quote]);

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
    setQuote(json.data);
    return json.data;
  }

  async function connect(w: DiscoveredWallet) {
    setBusy(true);
    setError(null);
    try {
      const addr = await requestAccounts(w.provider);
      const chain = await getChainId(w.provider);
      if (chain !== 56) {
        push("Wrong network — switching to BSC mainnet…");
        await switchToBsc(w.provider);
      }
      setProvider(w.provider);
      setAddress(addr);
      const q = await loadQuote(addr);
      if (!q.wallet?.enoughU) {
        setError(
          `Insufficient $U. Need ${q.budgetU} U on BSC mainnet (token ${q.addresses.paymentToken.slice(0, 8)}…).`,
        );
      }
      setStep("balances");
    } catch (e) {
      setError(explain(e, "tx"));
    } finally {
      setBusy(false);
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
    });
    push(`${label} tx ${hash.slice(0, 10)}…`);
    const rec = await waitForReceipt(eth, hash);
    if (rec.status !== "0x1") throw new Error(`${label} reverted`);
    return { hash, rec };
  }

  async function runFund() {
    if (!provider || !address || !quote) return;
    setBusy(true);
    setError(null);
    try {
      const chain = await getChainId(provider);
      if (chain !== 56) await switchToBsc(provider);

      const q = await loadQuote(address);
      if (!q.wallet?.enoughU) {
        throw new Error(`Insufficient $U. Need ${q.budgetU} U.`);
      }
      if (BigInt(q.wallet.bnbWei) < parseEtherSafe(MIN_BNB_BNB)) {
        throw new Error("Insufficient BNB for gas on BSC mainnet.");
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
        parseCreatedJobId(created.rec.logs) || q.predictedJobId;
      const check = await fetch(
        `/api/escrow/status?onchainJobId=${encodeURIComponent(createdId)}`,
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
        encodeRegisterJob(jobIdBig),
        "Register policy",
      );
      await send(
        provider,
        address,
        encodeSetBudget(jobIdBig, amount),
        "Set budget",
      );
      const funded = await send(
        provider,
        address,
        encodeFund(jobIdBig, amount),
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
      setError(explain(e, step === "approve" ? "token" : "gas"));
      setStep(address ? "balances" : "connect");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
      <div className="max-h-[min(92dvh,92vh)] w-full max-w-lg overflow-auto rounded-2xl border border-white/12 bg-[#121214] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
              Hire with escrow
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {agentName}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/50">
              {ESCROW_LINE}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-white/45 hover:text-white"
          >
            Close
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-50/90">
          {ESCROW_CTA}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-rose-200/90">
          {NEVER_PAY_SELLER}
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
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

        {step === "connect" && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-white/50">Connect a wallet on BSC mainnet to sign.</p>
            {wallets.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-white/55">
                No injected wallet in this browser. Preview below still shows
                the lock, kernel, and steps. Install MetaMask, Binance Wallet,
                or another EIP-6963 wallet on chain 56, then reopen.
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
              <p>
                Lock{" "}
                <span className="font-semibold text-white">
                  {quote.budgetU} {quote.tokenSymbol}
                </span>{" "}
                in the ERC-8183 kernel.
              </p>
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
            {quote.wallet && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] text-white/40">$U</div>
                  <div className="font-semibold text-white">
                    {formatUnits(BigInt(quote.wallet.uBalanceWei), quote.tokenDecimals)}
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] text-white/40">BNB (gas)</div>
                  <div className="font-semibold text-white">
                    {formatEther(BigInt(quote.wallet.bnbWei))}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[10px] text-white/40">
              Need {quote.budgetU} U + ~{quote.estimatedGasBnb} BNB gas (keep ≥{" "}
              {quote.minBnb} BNB). Submit the plan hash within{" "}
              {Math.round((quote.deadlineSeconds || 604800) / 86400)}d of fund.
              Dispute window {Math.round(quote.disputeWindowSeconds / 3600)}h
              after submit.
            </p>
            {quote.wallet && !quote.wallet.enoughU && (
              <p className="text-xs text-rose-200">Insufficient $U for this lock.</p>
            )}
            {quote.wallet && !enoughBnb && (
              <p className="text-xs text-rose-200">Insufficient BNB for gas.</p>
            )}
          </div>
        )}

        {step !== "connect" && step !== "done" && (
          <button
            type="button"
            disabled={
              busy || !quote?.wallet?.enoughU || !enoughBnb || brief.length <= 8
            }
            onClick={() => void runFund()}
            className="btn-primary mt-4 w-full disabled:opacity-40"
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
    </div>
  );
}

function parseEtherSafe(v: string): bigint {
  const [w, f = ""] = v.split(".");
  const frac = (f + "000000000000000000").slice(0, 18);
  return BigInt(w || "0") * BigInt(10) ** BigInt(18) + BigInt(frac || "0");
}
