"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trialStatus } from "@/lib/trial";

export function TrialBanner() {
  const [label, setLabel] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const t = trialStatus();
    setLabel(t.label);
    setExpired(t.expired);
  }, []);

  if (!label) return null;

  return (
    <div
      className={`border-b px-4 py-2 text-center text-[11px] sm:text-xs ${
        expired
          ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
          : "border-amber-400/25 bg-amber-400/10 text-amber-100"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="text-white/50">
        {" "}
        · 3 Studio sellers on BNB free cloud · Gridwright on local APEX ·{" "}
      </span>
      <Link href="/demo" className="font-semibold underline-offset-2 hover:underline">
        Demo path
      </Link>
      <span className="text-white/40"> · </span>
      <Link href="/ops" className="font-semibold underline-offset-2 hover:underline">
        Ops
      </Link>
    </div>
  );
}
