"use client";

import { useEffect, useState } from "react";
import { healthStyle, type AgentHealth, type LiveStatus } from "@/lib/agent-health";

type Props = {
  slug: string;
  className?: string;
};

export function AgentLiveBadge({ slug, className = "" }: Props) {
  const [h, setH] = useState<AgentHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agents/health", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          data?: AgentHealth[];
        };
        if (!cancelled && json.success && json.data) {
          setH(json.data.find((x) => x.slug === slug) || null);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!h) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-semibold text-white/40 ring-1 ring-inset ring-white/10 ${className}`}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30" />
        Checking…
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${healthStyle(h.status as LiveStatus)} ${className}`}
      title={h.detail}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          h.status === "live"
            ? "bg-emerald-400"
            : h.status === "local"
              ? "bg-sky-400"
              : h.status === "degraded"
                ? "bg-amber-400"
                : "bg-white/30"
        }`}
      />
      {h.label}
    </span>
  );
}

/** Server-friendly static badge when health already known */
export function LiveStatusPill({
  status,
  label,
  detail,
}: {
  status: LiveStatus;
  label: string;
  detail?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${healthStyle(status)}`}
      title={detail}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "live"
            ? "bg-emerald-400"
            : status === "local"
              ? "bg-sky-400"
              : status === "degraded"
                ? "bg-amber-400"
                : "bg-white/30"
        }`}
      />
      {label}
    </span>
  );
}
