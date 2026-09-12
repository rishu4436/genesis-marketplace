"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        const json = (await res.json()) as { data?: PublicAccount };
        setMe(res.ok && json.data ? json.data : null);
      })
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMe(null);
      setOpen(false);
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

  const triggerClass = stacked
    ? "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-white/80"
    : compact
      ? "rounded-full border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white"
      : "rounded-full border border-white/15 px-3.5 py-1.5 text-[0.8rem] font-semibold text-white hover:border-amber-400/40 hover:text-amber-100";

  const label = me
    ? me.email || (me.wallet ? shortWallet(me.wallet) : "Profile")
    : "Profile";

  const menu = me ? (
    <>
      <Link
        href="/dashboard"
        onClick={() => setOpen(false)}
        className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white"
      >
        My hires
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => void signOut()}
        className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-white/55 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </>
  ) : (
    <>
      <Link
        href="/login?mode=login&next=/dashboard"
        onClick={() => setOpen(false)}
        className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white"
      >
        Sign in
      </Link>
      <Link
        href="/login?mode=signup&next=/dashboard"
        onClick={() => setOpen(false)}
        className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-400/10"
      >
        Create account
      </Link>
    </>
  );

  return (
    <div ref={box} className={stacked ? "relative mt-1" : "relative"}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        <span className={stacked ? "truncate" : undefined}>{label}</span>
        {stacked ? (
          <span className="text-white/35">{open ? "▴" : "▾"}</span>
        ) : null}
      </button>
      {open && (
        <div
          role="menu"
          className={
            stacked
              ? "mt-1 rounded-xl border border-white/10 bg-black/40 p-1"
              : "absolute right-0 z-[80] mt-2 w-52 rounded-xl border border-white/12 bg-[#0c1018]/98 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
          }
        >
          {menu}
        </div>
      )}
    </div>
  );
}
