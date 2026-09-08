"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { HireDashboard } from "@/components/HireDashboard";
import { shortWallet } from "@/lib/demo-pay";
import type { BuyerRisk } from "@/lib/buyer-context";

type PublicAccount = {
  id: string;
  createdAt: string;
  email?: string;
  wallet?: string;
  displayName?: string;
  risk: BuyerRisk;
  hireCount: number;
};
import {
  discoverWallets,
  requestAccounts,
  signLoginMessage,
  type DiscoveredWallet,
} from "@/lib/wallet-pay";

const RISKS: { id: BuyerRisk; label: string }[] = [
  { id: "conservative", label: "Conservative" },
  { id: "moderate", label: "Moderate" },
  { id: "aggressive", label: "Aggressive" },
];

type Gate = "email" | "wallet";

export function ProfileHome() {
  const [me, setMe] = useState<PublicAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [risk, setRisk] = useState<BuyerRisk>("moderate");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const json = (await res.json()) as {
      success?: boolean;
      data?: PublicAccount;
    };
    if (res.ok && json.data) {
      setMe(json.data);
      setName(json.data.displayName || "");
      setRisk(json.data.risk);
    } else {
      setMe(null);
    }
  }

  useEffect(() => {
    refresh()
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  const initial = useMemo(() => {
    const letters = (name || me?.email || "G").trim().slice(0, 1).toUpperCase();
    return letters || "G";
  }, [name, me?.email]);

  async function saveProfile(patch: { displayName?: string; risk?: BuyerRisk }) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { data?: PublicAccount };
      if (json.data) {
        setMe(json.data);
        setName(json.data.displayName || "");
        setRisk(json.data.risk);
      }
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center text-sm text-white/45">
        Loading profile…
      </div>
    );
  }

  if (!me) {
    return <AuthGate onAuthed={() => void refresh()} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Account</p>
      <h1 className="display-section mt-3 text-white">Profile</h1>
      <p className="lead mt-4 max-w-xl">
        Signed in. Your name, risk, and hires live on this account — not just
        this browser.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="panel-strong flex flex-col items-center px-5 py-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-3xl font-bold text-black">
            {initial}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-white">
            {name.trim() || "Unnamed buyer"}
          </h2>
          <p className="mt-1 text-[11px] text-white/40">
            {me.hireCount} hire{me.hireCount === 1 ? "" : "s"} on this account
          </p>
          {me.email && (
            <p className="mt-3 text-[11px] text-white/50">{me.email}</p>
          )}
          {me.wallet && (
            <p className="mt-1 font-mono text-[11px] text-amber-200/80">
              {shortWallet(me.wallet)}
            </p>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-5 text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
          >
            Sign out
          </button>
        </div>

        <div className="panel-strong px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Saved on your account
          </p>
          <label className="mt-3 block">
            <span className="text-[11px] text-white/45">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveProfile({ displayName: name })}
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
                disabled={saving}
                onClick={() => void saveProfile({ risk: r.id })}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  risk === r.id
                    ? "bg-amber-400 text-black"
                    : "border border-white/12 bg-white/5 text-white/65"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            Sign in on another device with the same email or wallet to see this
            profile and your hires.
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
              Tied to this account. Recover older receipts with a claim code.
            </p>
          </div>
          <Link href="/browse" className="btn-primary !py-2 !text-sm">
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

function AuthGate({ onAuthed }: { onAuthed: () => void }) {
  const [tab, setTab] = useState<Gate>("email");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<DiscoveredWallet[] | null>(null);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not sign in");
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function showWallets() {
    setError(null);
    const list = await discoverWallets();
    if (list.length === 0) {
      setError("No browser wallet found.");
      return;
    }
    setChoices(list);
  }

  async function signInWallet(w: DiscoveredWallet) {
    setBusy(true);
    setError(null);
    try {
      const address = await requestAccounts(w.provider);
      const nonceRes = await fetch("/api/auth/wallet/nonce");
      const nonceJson = (await nonceRes.json()) as {
        data?: { nonce: string; message: string };
      };
      if (!nonceJson.data) throw new Error("Could not start wallet sign-in");
      const signature = await signLoginMessage(
        w.provider,
        address,
        nonceJson.data.message,
      );
      const res = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          nonce: nonceJson.data.nonce,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Wallet sign-in failed");
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Account</p>
      <h1 className="display-section mt-3 text-white">Create your profile</h1>
      <p className="lead mt-4">
        Email or wallet. That account holds your name, risk, and hires on any
        device.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-1.5">
        {(
          [
            ["email", "Email"],
            ["wallet", "Wallet"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setError(null);
            }}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              tab === id
                ? "bg-amber-400 text-black"
                : "border border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "email" ? (
        <form
          onSubmit={(e) => void submitEmail(e)}
          className="panel-strong mt-5 space-y-3 px-5 py-5"
        >
          <div className="flex gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={mode === "signup" ? "text-amber-200" : "text-white/40"}
            >
              Create account
            </button>
            <span className="text-white/20">·</span>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={mode === "login" ? "text-amber-200" : "text-white/40"}
            >
              Sign in
            </button>
          </div>
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ characters)"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
          />
          {error && <p className="text-xs text-rose-200">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full disabled:opacity-40"
          >
            {busy
              ? "Working…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      ) : (
        <div className="panel-strong mt-5 space-y-3 px-5 py-5">
          <p className="text-[11px] leading-relaxed text-white/50">
            Sign a one-time message. No BNB is sent. Same wallet later = same
            profile.
          </p>
          {choices && choices.length > 0 ? (
            <div className="space-y-1.5">
              {choices.map((w) => (
                <button
                  key={w.uuid}
                  type="button"
                  disabled={busy}
                  onClick={() => void signInWallet(w)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-white/85 hover:border-amber-400/35"
                >
                  {w.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.icon} alt="" className="h-7 w-7 rounded-md" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[10px]">
                      W
                    </span>
                  )}
                  {w.name}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void showWallets()}
              className="btn-secondary w-full !py-2.5"
            >
              Choose wallet
            </button>
          )}
          {error && <p className="text-xs text-rose-200">{error}</p>}
        </div>
      )}
    </div>
  );
}
