"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PARTNERS } from "@/lib/partners";

type Probe = {
  id: string;
  name: string;
  ok: boolean;
  mode: string;
  metric?: string;
  href: string;
};

type Snap = {
  liveCount: number;
  total: number;
  partners: Probe[];
};

export function PartnerLiveBadges() {
  const [snap, setSnap] = useState<Snap | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners/status")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.partners) {
          setSnap({
            liveCount: j.liveCount,
            total: j.total,
            partners: j.partners,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setSnap(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = snap?.partners ?? PARTNERS.map((p) => ({
    id: p.id,
    name: p.name,
    ok: true,
    mode: "local",
    href: p.href,
  }));

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {rows.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/65 transition hover:border-[#F0B90B]/35 hover:text-amber-100"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              p.ok === false
                ? "bg-rose-400"
                : p.mode === "live"
                  ? "bg-emerald-400"
                  : p.mode === "proof"
                    ? "bg-violet-400"
                    : "bg-amber-300"
            }`}
          />
          {p.name}
        </Link>
      ))}
      <Link
        href="/partners"
        className="text-[11px] font-semibold text-[#F0B90B]"
      >
        Status
        {snap ? ` ${snap.liveCount}/${snap.total}` : ""} →
      </Link>
    </div>
  );
}
