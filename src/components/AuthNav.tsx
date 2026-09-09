"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shortWallet } from "@/lib/demo-pay";

type PublicAccount = {
  email?: string;
  wallet?: string;
};

export function AuthNav({
  compact = false,
  stacked = false,
}: {
  compact?: boolean;
  stacked?: boolean;
}) {
  const [me, setMe] = useState<PublicAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        const json = (await res.json()) as { data?: PublicAccount };
        setMe(res.ok && json.data ? json.data : null);
      })
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMe(null);
      const path = window.location.pathname;
      if (
        path.startsWith("/dashboard") ||
        path.startsWith("/profile") ||
        path.startsWith("/login")
      ) {
        window.location.replace("/");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!me) {
    if (stacked) {
      return (
        <>
          <Link
            href="/login?mode=login"
            className="rounded-xl px-3 py-3 text-sm font-medium text-white/60"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="btn-solid mt-1 !h-11 w-full !text-sm"
          >
            Create account
          </Link>
        </>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <Link
          href="/login?mode=login"
          className={
            compact
              ? "rounded-full px-2 py-1.5 text-[11px] font-semibold text-white/70"
              : "rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-white/70 hover:text-white"
          }
        >
          Sign in
        </Link>
        <Link
          href="/login?mode=signup"
          className={
            compact
              ? "rounded-full bg-[#F0B90B] px-2.5 py-1.5 text-[11px] font-semibold text-black"
              : "rounded-full bg-[#F0B90B] px-3.5 py-1.5 text-[0.8rem] font-semibold text-black hover:bg-[#f5c842]"
          }
        >
          Create account
        </Link>
      </span>
    );
  }

  const label = me.email || (me.wallet ? shortWallet(me.wallet) : "Account");
  const chip = (
    <Link
      href="/dashboard"
      title="My hires"
      className={
        stacked
          ? "rounded-xl px-3 py-3 text-sm font-medium text-white"
          : compact
            ? "max-w-[7.5rem] truncate rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80"
            : "rounded-full border border-white/10 px-3 py-1.5 text-[0.8rem] font-medium text-white/75 hover:border-white/20 hover:text-white"
      }
    >
      {label}
    </Link>
  );
  const out = (
    <button
      type="button"
      disabled={busy}
      onClick={() => void signOut()}
      className={
        stacked
          ? "rounded-xl px-3 py-3 text-left text-sm font-medium text-white/60 disabled:opacity-40"
          : compact
            ? "rounded-full border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 disabled:opacity-40"
            : "rounded-full border border-white/15 px-3 py-1.5 text-[0.8rem] font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-40"
      }
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );

  if (stacked) {
    return (
      <>
        {chip}
        {out}
      </>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {chip}
      {out}
    </span>
  );
}
