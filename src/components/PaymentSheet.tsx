"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cardBrand,
  digitsOnly,
  evaluateDemoCard,
  formatCardNumber,
  makeDemoPayment,
  shortWallet,
  stripeTestCards,
  type DemoPayMethod,
  type DemoPayment,
} from "@/lib/demo-pay";

type Props = {
  agentName: string;
  amountUsd: number;
  onPaid: (payment: DemoPayment) => void;
  onCancel: () => void;
};

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEth(): Eth | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { ethereum?: Eth };
  return w.ethereum ?? null;
}

export function PaymentSheet({ agentName, amountUsd, onPaid, onCancel }: Props) {
  const [method, setMethod] = useState<DemoPayMethod>("card");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletSource, setWalletSource] = useState<"injected" | "demo" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInjected, setHasInjected] = useState(false);

  useEffect(() => {
    setHasInjected(Boolean(getEth()));
  }, []);

  const preview = useMemo(() => formatCardNumber(number), [number]);

  function fillDemoCard() {
    setNumber(formatCardNumber(stripeTestCards().success));
    setExpiry("12/30");
    setCvc("123");
    setName("Demo Buyer");
    setError(null);
  }

  async function connectWallet() {
    setError(null);
    const eth = getEth();
    if (eth) {
      try {
        const accs = (await eth.request({
          method: "eth_requestAccounts",
        })) as string[];
        if (accs?.[0]) {
          setWallet(accs[0]);
          setWalletSource("injected");
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet request rejected");
        return;
      }
    }
    setWallet("0xDEMO00000000000000000000000000000000BUY1");
    setWalletSource("demo");
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 700));
      if (method === "card") {
        const check = evaluateDemoCard(number);
        if (!check.ok) {
          setError(check.error || "Card failed");
          setBusy(false);
          return;
        }
        const exp = expiry.replace(/\s/g, "");
        if (!/^\d{2}\/\d{2}$/.test(exp)) {
          setError("Expiry must be MM/YY");
          setBusy(false);
          return;
        }
        if (digitsOnly(cvc).length < 3) {
          setError("Enter CVC");
          setBusy(false);
          return;
        }
        const d = digitsOnly(number);
        onPaid(
          makeDemoPayment({
            method: "card",
            amountUsd,
            last4: d.slice(-4),
            brand: cardBrand(d),
          }),
        );
        return;
      }
      if (!wallet) {
        setError("Connect a wallet first");
        setBusy(false);
        return;
      }
      onPaid(
        makeDemoPayment({
          method: "wallet",
          amountUsd,
          walletAddress: wallet,
          walletSource: walletSource || "demo",
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
            Checkout
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            Pay for {agentName}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Demo only — no Stripe account, no charge, no on-chain send. Same
            steps a real buyer will use later.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tabular-nums text-white">
            ${amountUsd}
          </div>
          <div className="text-[10px] text-white/40">USD · demo</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {(
          [
            ["card", "Card · Stripe demo"],
            ["wallet", "Wallet"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMethod(id);
              setError(null);
            }}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
              method === id
                ? "bg-amber-400 text-black"
                : "border border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {method === "card" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Card
            </span>
            <button
              type="button"
              onClick={fillDemoCard}
              className="text-[11px] font-medium text-amber-300 hover:text-amber-200"
            >
              Fill test card 4242…
            </button>
          </div>
          <label className="block">
            <span className="text-[11px] text-white/45">Number</span>
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              value={preview}
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-white/45">Expiry</span>
              <input
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(e) => {
                  let v = digitsOnly(e.target.value).slice(0, 4);
                  if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                  setExpiry(v);
                }}
                placeholder="12/30"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-white/45">CVC</span>
              <input
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvc}
                onChange={(e) => setCvc(digitsOnly(e.target.value).slice(0, 4))}
                placeholder="123"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] text-white/45">Name on card</span>
            <input
              autoComplete="cc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
            />
          </label>
          <p className="text-[10px] text-white/35">
            Success: 4242… · Decline: 4000 0000 0000 0002. Nothing is charged.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {wallet ? (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                {walletSource === "injected" ? "Connected" : "Demo wallet"}
              </p>
              <p className="mt-1 font-mono text-sm text-white">
                {shortWallet(wallet)}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={connectWallet}
              className="btn-secondary w-full !py-2.5 !text-sm"
            >
              {hasInjected ? "Connect wallet" : "Use demo wallet"}
            </button>
          )}
          <p className="text-[10px] leading-relaxed text-white/35">
            If MetaMask is installed we ask for the address only. We do not
            send a transaction. No wallet? Demo wallet still completes
            checkout.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void pay()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {busy ? "Confirming…" : `Pay $${amountUsd} · demo`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="text-center text-xs text-white/45 hover:text-white/70"
        >
          Back
        </button>
      </div>
    </div>
  );
}
