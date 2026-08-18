"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  discoverWallets,
  requestAccounts,
  signLoginMessage,
} from "@/lib/wallet-pay";

type PublicAccount = {
  email?: string;
  wallet?: string;
  hireCount: number;
};

export function HireAccountBar({
  onChange,
}: {
  onChange: (signedIn: boolean) => void;
}) {
  const [me, setMe] = useState<PublicAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const json = (await res.json()) as { data?: PublicAccount };
    if (res.ok && json.data) {
      setMe(json.data);
      onChange(true);
    } else {
      setMe(null);
      onChange(false);
    }
  }

  useEffect(() => {
    refresh()
      .catch(() => {
        setMe(null);
        onChange(false);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not sign in");
      await refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function walletIn() {
    setBusy(true);
    setErr(null);
    try {
      const found = await discoverWallets();
      const pick = found[0];
      if (!pick) throw new Error("No wallet in this browser");
      const nonceRes = await fetch("/api/auth/wallet/nonce");
      const nonceJson = (await nonceRes.json()) as {
        data?: { nonce: string; message: string };
      };
      const nonce = nonceJson.data?.nonce;
      const message = nonceJson.data?.message;
      if (!nonce || !message) throw new Error("Could not start wallet sign-in");
      const address = await requestAccounts(pick.provider);
      if (!address) throw new Error("Wallet returned no address");
      const signature = await signLoginMessage(
        pick.provider,
        address,
        message,
      );
      const res = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Wallet sign-in failed");
      await refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Wallet sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    onChange(false);
  }

  if (!ready) return null;

  if (me) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-white/70">
        <p>
          Signed in as{" "}
          <span className="font-semibold text-white">
            {me.email || me.wallet || "your account"}
          </span>
          . Hires follow this account — not just this browser.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">
        Sign in to keep your hires
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/45">
        Email or wallet. Then My hires shows the same plans on any phone. No
        profile form required. You can still recover a single receipt with a
        claim code.
      </p>
      <form onSubmit={submitEmail} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-solid !h-9 !text-sm disabled:opacity-40"
          >
            {busy
              ? "Working…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void walletIn()}
            className="btn-line !h-9 !text-sm disabled:opacity-40"
          >
            Wallet
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-xs text-white/40 hover:text-white/70"
          >
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </button>
        </div>
      </form>
      {err && <p className="mt-2 text-xs text-rose-200">{err}</p>}
    </div>
  );
}
