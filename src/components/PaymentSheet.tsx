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
import {
  connectInjectedWallet,
  getInjectedEth,
  sendBnbHire,
  type WalletQuote,
} from "@/lib/wallet-pay";

type Props = {
  agentName: string;
  amountUsd: number;
  onPaid: (payment: DemoPayment) => void;
  onCancel: () => void;
};

export function PaymentSheet({ agentName, amountUsd, onPaid, onCancel }: Props) {
  const [method, setMethod] = useState<DemoPayMethod>("card");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInjected, setHasInjected] = useState(false);
  const [quote, setQuote] = useState<WalletQuote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);

  useEffect(() => {
    setHasInjected(Boolean(getInjectedEth()));
  }, []);

  useEffect(() => {
    if (method !== "wallet") return;
    let dead = false;
    setQuoteErr(null);
    fetch(`/api/pay/quote?usd=${encodeURIComponent(String(amountUsd))}`)
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: WalletQuote; error?: string }) => {
        if (dead) return;
        if (!j.data) throw new Error(j.error || "Could not price BNB");
        setQuote(j.data);
      })
      .catch((e: unknown) => {
        if (!dead) {
          setQuote(null);
          setQuoteErr(e instanceof Error ? e.message : "Quote failed");
        }
      });
    return () => {
      dead = true;
    };
  }, [method, amountUsd]);

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
    try {
      const addr = await connectInjectedWallet();
      setWallet(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet request rejected");
    }
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      if (method === "card") {
        await new Promise((r) => setTimeout(r, 500));
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
      if (!quote) {
        setError(quoteErr || "Waiting for BNB quote");
        setBusy(false);
        return;
      }
      const hash = await sendBnbHire({
        from: wallet,
        to: quote.to,
        wei: quote.wei,
      });
      onPaid(
        makeDemoPayment({
          method: "wallet",
          amountUsd,
          demo: false,
          walletAddress: wallet,
          walletSource: "injected",
          txHash: hash,
          chainId: quote.chainId,
          amountWei: quote.wei,
          amountBnb: quote.bnb,
          payTo: quote.to,
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setError(
        msg.includes("rejected") || msg.includes("denied")
          ? "Wallet rejected the payment"
          : msg,
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
            Card is a Stripe test demo (no account, no charge). Wallet is
            live: real MetaMask, real BNB on BSC.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tabular-nums text-white">
            ${amountUsd}
          </div>
          <div className="text-[10px] text-white/40">
            {method === "wallet" ? "USD · paid in BNB" : "USD · card demo"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {(
          [
            ["card", "Card · Stripe demo"],
            ["wallet", "Wallet · live BSC"],
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
                Connected · BSC
              </p>
              <p className="mt-1 font-mono text-sm text-white">
                {shortWallet(wallet)}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void connectWallet()}
              className="btn-secondary w-full !py-2.5 !text-sm"
            >
              {hasInjected ? "Connect MetaMask" : "Install a wallet to pay"}
            </button>
          )}
          {quote && (
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-white/60">
              Send{" "}
              <span className="font-semibold text-amber-200">
                {quote.bnb} BNB
              </span>{" "}
              (~${amountUsd} at ${quote.bnbUsd.toFixed(0)}/BNB) to{" "}
              <span className="font-mono text-white/80">
                {shortWallet(quote.to)}
              </span>
              . This is a real transfer.
            </div>
          )}
          {quoteErr && (
            <p className="text-xs text-rose-200">{quoteErr}</p>
          )}
          <p className="text-[10px] leading-relaxed text-white/35">
            Requires MetaMask (or another injected wallet) on BNB Smart Chain.
            Confirm in the wallet. No fake wallet. Gas is extra.
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
          disabled={
            busy ||
            (method === "wallet" && (!hasInjected || !wallet || !quote))
          }
          onClick={() => void pay()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {busy
            ? method === "wallet"
              ? "Waiting for wallet…"
              : "Confirming…"
            : method === "wallet"
              ? `Pay ${quote?.bnb ?? "…"} BNB · live`
              : `Pay $${amountUsd} · demo`}
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
