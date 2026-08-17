"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trialStatus } from "@/lib/trial";

/** Internal ops banner — hidden on the public landing page. */
export function TrialBanner() {
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (pathname === "/") return;
    const t = trialStatus();
    setLabel(t.label);
    setExpired(t.expired);
    try {
      if (sessionStorage.getItem("genesis-trial-banner-dismiss") === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  // Keep chrome minimal — only show on ops
  if (pathname !== "/ops" || !label || dismissed) return null;

  return (
    <div
      className={`relative border-b px-4 py-2 pr-12 text-center text-[11px] sm:text-xs ${
        expired
          ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
          : "border-amber-400/15 bg-amber-400/[0.06] text-amber-50/90"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="text-white/40"> · </span>
      <Link
        href="/ops"
        className="font-medium text-amber-200/90 underline-offset-2 hover:underline"
      >
        Ops
      </Link>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem("genesis-trial-banner-dismiss", "1");
          } catch {
            /* ignore */
          }
        }}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-white/35 hover:bg-white/10 hover:text-white/70"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
