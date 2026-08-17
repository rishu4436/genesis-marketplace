"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OutcomeSnapshot } from "@/lib/outcomes";

export function OutcomesPanel() {
  const [data, setData] = useState<OutcomeSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/outcomes", { cache: "no-store" });
        const json = (await res.json()) as {
          success: boolean;
          data?: OutcomeSnapshot;
        };
        if (!cancelled && json.success && json.data) setData(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="panel px-5 py-8 text-center text-sm text-white/40">
        Loading marketplace outcomes…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Jobs recorded", value: String(data.totalJobs) },
          { label: "Delivered", value: String(data.delivered) },
          { label: "Success rate", value: `${data.successRate}%` },
          {
            label: "Avg price",
            value: data.avgPriceUsd != null ? `$${data.avgPriceUsd}` : "—",
          },
        ].map((s) => (
          <div key={s.label} className="panel px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {s.label}
            </div>
            <div className="stat-value mt-1 text-2xl">{s.value}</div>
          </div>
        ))}
      </div>

      {data.byAgent.length > 0 && (
        <div className="panel p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            By agent
          </h3>
          <ul className="mt-3 space-y-2">
            {data.byAgent.slice(0, 6).map((a) => (
              <li
                key={a.slug || a.name}
                className="flex justify-between text-xs text-white/60"
              >
                <span className="font-medium text-white/80">{a.name}</span>
                <span>
                  {a.delivered}/{a.count} delivered
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.recent.length > 0 && (
        <div className="panel p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Recent (server ledger)
          </h3>
          <ul className="mt-3 space-y-2">
            {data.recent.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-white/70">{r.agentName}</span>
                <Link
                  href={`/jobs/${encodeURIComponent(r.id)}`}
                  className="font-mono text-[10px] text-amber-300/80 hover:underline"
                >
                  {r.id.slice(0, 18)}…
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.totalJobs === 0 && (
        <p className="text-center text-xs text-white/40">
          No durable jobs yet — buy an agent to populate the ledger.
        </p>
      )}
    </div>
  );
}
