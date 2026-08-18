"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shortWallet } from "@/lib/demo-pay";

type PublicAccount = {
  email?: string;
  wallet?: string;
};

export function AuthNav({ compact = false }: { compact?: boolean }) {
  const [me, setMe] = useState<PublicAccount | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        const json = (await res.json()) as { data?: PublicAccount };
        setMe(res.ok && json.data ? json.data : null);
      })
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready || !me) {
    return (
      <Link
        href="/login"
        className={
          compact
            ? "rounded-full border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white"
            : "rounded-full border border-white/15 px-3.5 py-1.5 text-[0.8rem] font-semibold text-white hover:border-amber-400/40 hover:text-amber-100"
        }
      >
        Sign in
      </Link>
    );
  }

  const label = me.email || (me.wallet ? shortWallet(me.wallet) : "Account");
  return (
    <Link
      href="/dashboard"
      title="My hires"
      className={
        compact
          ? "max-w-[7.5rem] truncate rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80"
          : "rounded-full border border-white/10 px-3 py-1.5 text-[0.8rem] font-medium text-white/75 hover:border-white/20 hover:text-white"
      }
    >
      {label}
    </Link>
  );
}
