"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Session = {
  id: string;
  agentSlug: string;
  agentName: string;
  walletAddress: string;
  publicKey: string;
  permissions: {
    calls: { to?: string; signature?: string }[];
    spend: { limit: string; period: string; token?: string; label?: string }[];
  };
  expiry: number;
  transactionHash?: string;
  faucetTxHash?: string;
  adminAddress?: string;
  status: string;
  mode: string;
  chainId: number;
  createdAt: string;
  explorerUrl?: string;
  policyTitle?: string;
  keystore?: string;
};

type Status = {
  mode: string;
  liveCapable: boolean;
  adminAddress?: string | null;
  network: string;
  chainId: number;
  faucet?: string;
};

const AGENTS = [
  { slug: "range-keeper", name: "RangeKeeper" },
  { slug: "gridwright", name: "Gridwright" },
  { slug: "yield-router", name: "YieldRouter" },
  { slug: "health-sentinel", name: "HealthSentinel" },
];

export function AltanaPanel({
  defaultAgent,
  compact,
}: {
  defaultAgent?: string;
  compact?: boolean;
}) {
  const [agentSlug, setAgentSlug] = useState(
    defaultAgent || "range-keeper",
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forceDemo, setForceDemo] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [sessRes, statRes] = await Promise.all([
        fetch("/api/altana/sessions", { cache: "no-store" }),
        fetch("/api/altana/status", { cache: "no-store" }),
      ]);
      const sessJson = (await sessRes.json()) as {
        success: boolean;
        data?: Session[];
      };
      const statJson = (await statRes.json()) as {
        success: boolean;
        data?: Status;
      };
      if (sessJson.success && sessJson.data) setSessions(sessJson.data);
      if (statJson.success && statJson.data) setStatus(statJson.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function grant() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/altana/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug, forceDemo }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: Session;
        message?: string;
        error?: string;
      };
      if (!json.success) throw new Error(json.error || "Grant failed");
      setMsg(json.message || "Session granted");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/altana/sessions/${encodeURIComponent(id)}/revoke`,
        { method: "POST" },
      );
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error || "Revoke failed");
      setMsg("Session revoked");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const filtered = defaultAgent
    ? sessions.filter((s) => s.agentSlug === defaultAgent)
    : sessions;

  return (
    <div
      id="altana"
      className={`scroll-mt-28 rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-500/10 to-white/[0.02] ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
            Altana session
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-white">
            Scoped agent authority
          </h3>
        </div>
        <Link
          href="/altana"
          className="text-[11px] font-medium text-violet-200 hover:underline"
        >
          All policies →
        </Link>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-white/50">
        Grant a time-bounded key: allowlisted contracts, spend caps, auto-expiry.
        Revoke anytime. Permissions designed for Altana Keystore verification.
      </p>
      {status && (
        <p className="mt-2 text-[11px] text-white/45">
          Mode{" "}
          <span
            className={
              status.liveCapable
                ? "font-semibold text-emerald-300"
                : "font-semibold text-amber-200"
            }
          >
            {status.mode}
          </span>
          {status.adminAddress && (
            <span className="ml-1 font-mono text-white/35">
              · {status.adminAddress.slice(0, 6)}…{status.adminAddress.slice(-4)}
            </span>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        {!defaultAgent && (
          <label className="text-[10px] text-white/45">
            Specialist
            <select
              value={agentSlug}
              onChange={(e) => setAgentSlug(e.target.value)}
              className="mt-0.5 block rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
            >
              {AGENTS.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-1.5 text-[10px] text-white/45">
          <input
            type="checkbox"
            checked={forceDemo}
            onChange={(e) => setForceDemo(e.target.checked)}
          />
          Force demo (no chain)
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={grant}
          className="rounded-full bg-violet-400 px-3.5 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {loading ? "Working…" : "Grant session"}
        </button>
      </div>

      {msg && (
        <p className="mt-2 text-[11px] text-emerald-300/90">{msg}</p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-rose-300">{error}</p>
      )}

      <div className="mt-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Your sessions
        </p>
        {filtered.length === 0 ? (
          <p className="text-[11px] text-white/35">No sessions yet.</p>
        ) : (
          filtered.map((s) => (
            <article
              key={s.id}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[11px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-white">
                    {s.agentName}
                  </span>
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                      s.status === "active"
                        ? "bg-emerald-400/15 text-emerald-300"
                        : s.status === "demo"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-white/10 text-white/45"
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="ml-1 text-white/35">{s.mode}</span>
                </div>
                {(s.status === "active" || s.status === "demo") && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => revoke(s.id)}
                    className="rounded-full border border-rose-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/10"
                  >
                    Revoke
                  </button>
                )}
              </div>
              <p className="mt-1 font-mono text-[10px] text-white/40 break-all">
                wallet {s.walletAddress}
              </p>
              <p className="mt-0.5 text-[10px] text-white/40">
                expires {new Date(s.expiry * 1000).toLocaleString()} · chain{" "}
                {s.chainId}
              </p>
              <ul className="mt-1.5 text-[10px] text-white/50">
                {s.permissions.spend.slice(0, 3).map((sp, i) => (
                  <li key={i}>
                    · spend {sp.label || `${sp.limit} / ${sp.period}`}
                  </li>
                ))}
                {s.permissions.calls.slice(0, 3).map((c, i) => (
                  <li key={`c${i}`} className="font-mono truncate">
                    · call {c.to || c.signature || "—"}
                  </li>
                ))}
              </ul>
              {s.transactionHash && (
                <p className="mt-1 font-mono text-[10px] text-emerald-300/80 break-all">
                  tx {s.transactionHash}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-3">
                {s.explorerUrl && (
                  <a
                    href={s.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-violet-200 hover:underline"
                  >
                    {s.mode === "live" ? "Grant tx on BscScan ↗" : "Explorer ↗"}
                  </a>
                )}
                {s.keystore && (
                  <a
                    href={
                      s.chainId === 56
                        ? `https://bscscan.com/address/${s.keystore}`
                        : `https://testnet.bscscan.com/address/${s.keystore}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-violet-200 hover:underline"
                  >
                    Keystore ↗
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
