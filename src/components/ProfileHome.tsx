"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HireDashboard } from "@/components/HireDashboard";
import type { HireJob } from "@/lib/hire-engine";
import { shortWallet } from "@/lib/demo-pay";
import {
  defaultBuyerContext,
  loadBuyerContext,
  saveBuyerContext,
  type BuyerContext,
  type BuyerRisk,
} from "@/lib/buyer-context";

const RISKS: { id: BuyerRisk; label: string }[] = [
  { id: "conservative", label: "Conservative" },
  { id: "moderate", label: "Moderate" },
  { id: "aggressive", label: "Aggressive" },
];

function lastWalletFromHires(): string | null {
  try {
    const raw = localStorage.getItem("genesis-hires");
    const arr = raw ? (JSON.parse(raw) as HireJob[]) : [];
    for (const j of arr) {
      if (j.payment?.walletAddress) return j.payment.walletAddress;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function ProfileHome() {
  const [ctx, setCtx] = useState<BuyerContext>(defaultBuyerContext());
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [hireCount, setHireCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadBuyerContext();
    setCtx(loaded);
    setName(
      loaded.displayName && loaded.displayName !== "Demo buyer"
        ? loaded.displayName
        : "",
    );
    setWallet(lastWalletFromHires());
    try {
      const raw = localStorage.getItem("genesis-hires");
      const arr = raw ? (JSON.parse(raw) as HireJob[]) : [];
      setHireCount(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setHireCount(0);
    }
    setReady(true);
  }, []);

  const initial = useMemo(() => {
    const letters = (name || "G").trim().slice(0, 1).toUpperCase();
    return letters || "G";
  }, [name]);

  function persistName() {
    const next = saveBuyerContext({
      ...ctx,
      displayName: name.trim() || undefined,
    });
    if (next) setCtx(next);
  }

  function persistRisk(risk: BuyerRisk) {
    const next = saveBuyerContext({ ...ctx, risk });
    if (next) setCtx(next);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Buyer</p>
      <h1 className="display-section mt-3 text-white">Profile</h1>
      <p className="lead mt-4 max-w-xl">
        No account. This is your buyer desk on this device — plus any hire
        you recover with a claim code.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="panel-strong flex flex-col items-center px-5 py-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-3xl font-bold text-black">
            {ready ? initial : "·"}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-white">
            {name.trim() || "Unnamed buyer"}
          </h2>
          <p className="mt-1 text-[11px] text-white/40">
            {hireCount} hire{hireCount === 1 ? "" : "s"} on this device
          </p>
          {wallet && (
            <p className="mt-3 font-mono text-[11px] text-amber-200/80">
              {shortWallet(wallet)}
            </p>
          )}
        </div>

        <div className="panel-strong px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            How we address you
          </p>
          <label className="mt-3 block">
            <span className="text-[11px] text-white/45">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={persistName}
              placeholder="Your name"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
            />
          </label>
          <p className="mt-4 text-[11px] text-white/45">Risk preference</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {RISKS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => persistRisk(r.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  ctx.risk === r.id
                    ? "bg-amber-400 text-black"
                    : "border border-white/12 bg-white/5 text-white/65"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            Used when you buy a full plan. Not a login. Not shared.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label">Receipts</p>
            <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-white">
              Your hires
            </h2>
            <p className="body-sm mt-1.5 max-w-xl">
              Recover with a claim code on any phone. You do not buy again.
            </p>
          </div>
          <Link href="/hire" className="btn-primary !py-2 !text-sm">
            Hire an agent
          </Link>
        </div>
        <div className="mt-5">
          <HireDashboard />
        </div>
      </div>
    </div>
  );
}
