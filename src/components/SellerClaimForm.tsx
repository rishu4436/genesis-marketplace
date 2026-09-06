"use client";

import { useState } from "react";

export function SellerClaimForm() {
  const [displayName, setDisplayName] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [priceUsd, setPriceUsd] = useState("10");
  const [skills, setSkills] = useState("");
  const [pitch, setPitch] = useState("");
  const [x402, setX402] = useState(false);
  const [serviceUrl, setServiceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [probe, setProbe] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          tokenId,
          ownerAddress: ownerAddress || undefined,
          priceUsd: Number(priceUsd) || 10,
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          pitch,
          x402,
          serviceUrl: serviceUrl || undefined,
          chainId: 56,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { id: string };
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Claim failed");
      }
      setDoneId(json.data?.id || "ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (doneId) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
        <p className="text-sm font-semibold text-emerald-200">Listing claimed</p>
        <p className="mt-1 text-xs text-white/50">
          Your agent is on the seller board. Full wallet signature verification
          ships with production claim flow.
        </p>
        <button
          type="button"
          className="btn-secondary mt-4 !text-xs"
          onClick={() => {
            setDoneId(null);
            setDisplayName("");
            setTokenId("");
          }}
        >
          Claim another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-white/50">
          Display name
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
            placeholder="My Yield Agent"
          />
        </label>
        <label className="block text-xs text-white/50">
          ERC-8004 token ID
          <input
            required
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
            placeholder="1773"
          />
        </label>
        <label className="block text-xs text-white/50">
          Owner address (optional)
          <input
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
            placeholder="0x…"
          />
        </label>
        <label className="block text-xs text-white/50">
          List price (USD)
          <input
            type="number"
            min={1}
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          />
        </label>
      </div>

      <label className="block text-xs text-white/50">
        Skills (comma-separated)
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          placeholder="yield routing, risk alerts"
        />
      </label>

      <label className="block text-xs text-white/50">
        Pitch
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          placeholder="What does this agent do best?"
        />
      </label>

      <label className="block text-xs text-white/50">
        Service / A2A card URL (optional)
        <input
          value={serviceUrl}
          onChange={(e) => setServiceUrl(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          placeholder="https://…/.well-known/agent-card.json"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary !text-xs"
          disabled={!serviceUrl || loading}
          onClick={async () => {
            setProbe(null);
            setError(null);
            try {
              const res = await fetch("/api/sell/probe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: serviceUrl }),
              });
              const json = (await res.json()) as {
                success?: boolean;
                error?: string;
                data?: { name?: string; hireable?: boolean };
              };
              if (!json.success) {
                setProbe(`Not hireable yet: ${json.error || "no card"}`);
              } else {
                setProbe(
                  `Reachable${json.data?.name ? ` · ${json.data.name}` : ""} — claim to list`,
                );
                if (json.data?.name && !displayName) {
                  setDisplayName(json.data.name);
                }
              }
            } catch {
              setProbe("Probe failed");
            }
          }}
        >
          Probe A2A card
        </button>
        {probe && <p className="text-[11px] text-white/50">{probe}</p>}
      </div>

      <label className="flex items-center gap-2 text-xs text-white/60">
        <input
          type="checkbox"
          checked={x402}
          onChange={(e) => setX402(e.target.checked)}
          className="rounded border-white/20"
        />
        Supports x402 payments
      </label>

      {error && (
        <p className="text-xs text-rose-300">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? "Listing…" : "Claim & list agent"}
      </button>
    </form>
  );
}
