"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  discoverWallets,
  requestAccounts,
  signLoginMessage,
  type DiscoveredWallet,
} from "@/lib/wallet-pay";

export type PublicAccount = {
  email?: string;
  wallet?: string;
  hireCount: number;
};

async function attachLocalHires(extraJobId?: string) {
  const ids = new Set<string>();
  if (extraJobId) ids.add(extraJobId);
  try {
    const local = JSON.parse(
      localStorage.getItem("genesis-hires") || "[]",
    ) as { id?: string }[];
    for (const job of local) if (job.id) ids.add(job.id);
  } catch {
    /* ignore */
  }
  if (ids.size === 0) return;
  await fetch("/api/profile/hires", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobIds: [...ids] }),
  });
}

export function SignInForm({
  onChange,
  jobId,
  redirectTo,
  defaultMode = "login",
  title = "Keep these hires on an account",
  hint = "Create an account or sign in. My hires then shows the same plans on any browser.",
}: {
  onChange?: (signedIn: boolean) => void;
  jobId?: string;
  redirectTo?: string;
  defaultMode?: "login" | "signup";
  title?: string;
  hint?: string;
}) {
  const [me, setMe] = useState<PublicAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[] | null>(null);

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const json = (await res.json()) as { data?: PublicAccount };
    if (res.ok && json.data) {
      setMe(json.data);
      onChange?.(true);
      return true;
    }
    setMe(null);
    onChange?.(false);
    return false;
  }

  useEffect(() => {
    refresh()
      .then(async (ok) => {
        if (ok && redirectTo) {
          window.location.replace(redirectTo);
        }
      })
      .catch(() => {
        setMe(null);
        onChange?.(false);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function afterAuth() {
    await attachLocalHires(jobId);
    await refresh();
    if (redirectTo) window.location.replace(redirectTo);
  }

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
      await afterAuth();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function showWallets() {
    setErr(null);
    const found = await discoverWallets();
    if (found.length === 0) {
      setErr("No wallet in this browser");
      return;
    }
    if (found.length === 1) {
      await walletIn(found[0]);
      return;
    }
    setWallets(found);
  }

  async function walletIn(pick: DiscoveredWallet) {
    setBusy(true);
    setErr(null);
    try {
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
      setWallets(null);
      await afterAuth();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Wallet sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    onChange?.(false);
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
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/45">{hint}</p>
      <form onSubmit={submitEmail} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
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
            onClick={() => void showWallets()}
            className="btn-line !h-9 !text-sm disabled:opacity-40"
          >
            Wallet
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-xs text-white/40 hover:text-white/70"
          >
            {mode === "login" ? "Create account" : "Already have an account?"}
          </button>
        </div>
      </form>
      {wallets && wallets.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Wallets in this browser
          </p>
          {wallets.map((w) => (
            <button
              key={w.uuid}
              type="button"
              disabled={busy}
              onClick={() => void walletIn(w)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-white/85 hover:border-amber-400/35 disabled:opacity-40"
            >
              {w.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.icon} alt="" className="h-7 w-7 rounded-md" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[10px]">
                  W
                </span>
              )}
              <span className="font-medium">{w.name}</span>
            </button>
          ))}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-rose-200">{err}</p>}
    </div>
  );
}
