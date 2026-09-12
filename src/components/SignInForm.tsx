"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  title,
  hint,
  syncUrl = false,
  compact = false,
  hideModeSwitch = false,
}: {
  onChange?: (signedIn: boolean) => void;
  jobId?: string;
  redirectTo?: string;
  defaultMode?: "login" | "signup";
  title?: string;
  hint?: string;
  /** Keep /login?mode= in the URL when the tab changes. */
  syncUrl?: boolean;
  compact?: boolean;
  /** Choice already happened on /profile — form is one mode. */
  hideModeSwitch?: boolean;
}) {
  const router = useRouter();
  const [me, setMe] = useState<PublicAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[] | null>(null);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setErr(null);
    setConfirm("");
    setWallets(null);
    if (!syncUrl || typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("mode", next);
    router.replace(`${u.pathname}${u.search}${u.hash}`, { scroll: false });
  }

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
      if (mode === "signup") {
        if (password !== confirm) {
          throw new Error("Passwords do not match");
        }
      }
      const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg = json.error || "Could not continue";
        if (/already exists/i.test(msg)) {
          setErr("That email already has an account. Sign in instead.");
          return;
        }
        throw new Error(msg);
      }
      await afterAuth();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  async function showWallets() {
    setErr(null);
    const found = await discoverWallets();
    if (found.length === 0) {
      setErr("No wallet in this browser. Install MetaMask or Binance Wallet, or use email.");
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

  if (!ready) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">
        Loading account…
      </div>
    );
  }

  if (me) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-white/70">
        <p>
          Signed in as{" "}
          <span className="font-semibold text-white">
            {me.email || me.wallet || "your account"}
          </span>
          {me.hireCount > 0 ? (
            <span className="text-white/45">
              {" "}
              · {me.hireCount} hire{me.hireCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="text-xs font-semibold text-amber-200 hover:text-amber-100"
          >
            Open My hires
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const isSignup = mode === "signup";
  const heading =
    title || (isSignup ? "Create your account" : "Sign in");
  const sub =
    hint ||
    (isSignup
      ? "Hires on this account show up on any phone. Guest plans stay in this browser until you save them."
      : "Use the email you created, or the wallet you pay with. Guest receipts still open with a claim code.");

  const field =
    "mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none ring-amber-400/30 placeholder:text-white/30 focus:ring-2";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      {!hideModeSwitch && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/35 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              !isSignup
                ? "bg-white/[0.1] text-white"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isSignup
                ? "bg-[#F0B90B] text-black"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            Create account
          </button>
        </div>
      )}

      <p className={`${hideModeSwitch ? "mt-0" : "mt-4"} text-sm font-semibold text-white`}>
        {heading}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/45">{sub}</p>

      <form onSubmit={submitEmail} className="mt-4 grid gap-3">
        <label className="block">
          <span className="text-[11px] font-medium text-white/50">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-white/50">
            {isSignup ? "Password (8+ characters)" : "Password"}
          </span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              className={`${field} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] text-white/45 hover:text-white/80"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {isSignup && (
          <label className="block">
            <span className="text-[11px] font-medium text-white/50">
              Confirm password
            </span>
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
              className={field}
            />
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-solid mt-1 !h-11 w-full !text-sm disabled:opacity-40"
        >
          {busy
            ? "Working…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {err && (
        <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
          <p className="text-xs text-rose-100">{err}</p>
          {/already has an account/i.test(err) && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mt-1 text-xs font-semibold text-amber-200 hover:text-amber-100"
            >
              Go to sign in
            </button>
          )}
          {/wrong/i.test(err) && (
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="mt-1 text-xs font-semibold text-amber-200 hover:text-amber-100"
            >
              Create an account
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
          or wallet
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/40">
        Same wallet you pay with. Signs you in, or creates an account if this
        wallet is new. No extra password.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void showWallets()}
        className="btn-line mt-2 !h-11 w-full !text-sm disabled:opacity-40"
      >
        {busy ? "Waiting for wallet…" : "Continue with wallet"}
      </button>
      {wallets && wallets.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Pick a wallet
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

      {!compact && (
        <p className="mt-4 text-[11px] leading-relaxed text-white/35">
          Lost the password? Sign in with the same wallet, or open a receipt
          with the claim code below.
        </p>
      )}
    </div>
  );
}
