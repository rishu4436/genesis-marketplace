"use client";

import { useState } from "react";
import Link from "next/link";
import { listingHref, matchingGenesisSlug } from "@/lib/hire-class";
import type { Agent } from "@/lib/types";

export function CompareHireAll({
  task,
  agents,
}: {
  task: string;
  agents: Agent[];
}) {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<
    { name: string; path: string; error?: string }[]
  >([]);

  if (!task.trim() || agents.length === 0) return null;

  async function run() {
    setBusy(true);
    setResults([]);
    const out: { name: string; path: string; error?: string }[] = [];
    for (const a of agents.slice(0, 3)) {
      const genesisSlug = matchingGenesisSlug(a);
      try {
        const res = await fetch("/api/hire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainId: a.chain_id,
            tokenId: a.token_id,
            agentName: a.name,
            genesisSlug: genesisSlug || undefined,
            task,
            budgetUsd: "10",
            duration: "once",
            risk: "medium",
            autoFulfill: true,
            tier: "full",
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          sharePath?: string;
          error?: string;
        };
        if (!res.ok || !json.success || !json.sharePath) {
          out.push({
            name: a.name || `#${a.token_id}`,
            path: listingHref(a),
            error: json.error || "Hire failed",
          });
        } else {
          out.push({
            name: a.name || `#${a.token_id}`,
            path: json.sharePath,
          });
        }
      } catch (e) {
        out.push({
          name: a.name || `#${a.token_id}`,
          path: listingHref(a),
          error: e instanceof Error ? e.message : "Hire failed",
        });
      }
    }
    setResults(out);
    setBusy(false);
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">Same brief, all listed</p>
      <p className="mt-1 text-[12px] text-white/45">
        Runs a plan-only hire on each row. You keep the keys.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="btn-primary mt-3 !px-4 !py-2 !text-xs disabled:opacity-50"
      >
        {busy ? "Hiring…" : "Hire this brief on all"}
      </button>
      {results.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {results.map((r) => (
            <li key={r.path + r.name}>
              <span className="text-white/70">{r.name}</span>{" "}
              {r.error ? (
                <span className="text-rose-300/80">{r.error}</span>
              ) : (
                <Link href={r.path} className="text-amber-300 hover:underline">
                  Open receipt →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
