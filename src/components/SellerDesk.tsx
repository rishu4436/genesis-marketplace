"use client";

import { useCallback, useEffect, useState } from "react";
import { SignInForm } from "@/components/SignInForm";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import type { SellerListing } from "@/lib/seller-listing-types";
import {
  discoverWallets,
  requestAccounts,
  signLoginMessage,
} from "@/lib/wallet-pay";
import { listAgentMessage } from "@/lib/auth-messages";

type JobRow = {
  id: string;
  agentName: string;
  tokenId: string;
  status: string;
  task: string;
  escrowStatus: string | null;
  onchainJobId: string | null;
  href: string;
};

export function SellerDesk() {
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [tokenId, setTokenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/sell/me");
    if (res.status === 401) {
      setNeedAuth(true);
      setWallet(null);
      setListings([]);
      setReady(true);
      return;
    }
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        wallet: string | null;
        listings: SellerListing[];
        jobs: JobRow[];
      };
    };
    if (!json.success || !json.data?.wallet) {
      setNeedAuth(true);
      setWallet(json.data?.wallet || null);
      setReady(true);
      return;
    }
    setNeedAuth(false);
    setWallet(json.data.wallet);
    setListings(json.data.listings || []);
    setJobs(json.data.jobs || []);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function claim() {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const nonceRes = await fetch("/api/auth/wallet/nonce");
      const nonceJson = (await nonceRes.json()) as {
        data?: { nonce: string };
      };
      const nonce = nonceJson.data?.nonce;
      if (!nonce) throw new Error("Could not start ownership signature");
      const wallets = await discoverWallets();
      if (!wallets.length) throw new Error("No wallet in this browser");
      const provider = wallets[0].provider;
      await requestAccounts(provider);
      const signature = await signLoginMessage(
        provider,
        wallet || "",
        listAgentMessage(nonce, tokenId.trim()),
      );
      const res = await fetch("/api/sell/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: tokenId.trim(),
          chainId: 56,
          signature,
          nonce,
        }),
      });
      const json = (await res.json()) as { error?: string; note?: string };
      if (!res.ok) throw new Error(json.error || "Claim failed");
      setNote(json.note || "Indexed. Not hireable yet.");
      setTokenId("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <p className="text-sm text-white/40">Loading seller desk…</p>
    );
  }

  if (needAuth) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/55">
          Sign in with the wallet that owns the ERC-8004 token. Email-only
          accounts cannot list. A claim does not make you hireable.
        </p>
        <SignInForm
          defaultMode="login"
          syncUrl={false}
          compact
          redirectTo="/sell"
          title="Seller sign in"
          hint="Use the wallet that owns your agent NFT on BSC."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-[12px] text-white/45">
        Signed in as{" "}
        <span className="font-mono text-white/70">{wallet}</span>
        . Gate 1: you own the token → Indexed. Gate 2: live A2A + one of
        four jobs → Hire floor.
      </p>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">
          1. Prove you own the token
        </h2>
        <p className="mt-1 text-[12px] text-white/45">
          We read ownerOf on the identity registry. No USD price. Indexed
          is not Hire.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="ERC-8004 token id *"
            required
            aria-required="true"
            className="min-w-[10rem] flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <button
            type="button"
            disabled={busy || !tokenId.trim()}
            onClick={() => void claim()}
            className="btn-solid !h-10 !px-4 !text-sm disabled:opacity-40"
          >
            {busy ? "Checking…" : "Claim as Indexed"}
          </button>
        </div>
      </section>

      {err && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {err}
        </p>
      )}
      {note && (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {note}
        </p>
      )}

      {listings.length === 0 ? (
        <p className="text-sm text-white/40">No listings on this wallet yet.</p>
      ) : (
        listings.map((row) => (
          <TicketEditor
            key={row.id}
            listing={row}
            jobs={jobs.filter((j) => String(j.tokenId) === String(row.tokenId))}
            onSaved={() => void refresh()}
          />
        ))
      )}
    </div>
  );
}

function TicketEditor({
  listing,
  jobs,
  onSaved,
}: {
  listing: SellerListing;
  jobs: JobRow[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(listing.name);
  const [categoryId, setCategoryId] = useState<CategoryId | "">(
    listing.categoryId || "",
  );
  const [a2aUrl, setA2aUrl] = useState(listing.a2aUrl);
  const [youSend, setYouSend] = useState(listing.youSend);
  const [youGet, setYouGet] = useState(listing.youGet);
  const [lockU, setLockU] = useState(listing.lockU || "");
  const [quoteOnly, setQuoteOnly] = useState(listing.quoteOnly);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function saveTicket() {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const res = await fetch("/api/sell/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          name,
          categoryId,
          a2aUrl,
          youSend,
          youGet,
          lockU: quoteOnly ? "" : lockU,
          quoteOnly,
        }),
      });
      const json = (await res.json()) as { error?: string; note?: string };
      if (!res.ok) throw new Error(json.error || "Ticket failed");
      setNote(json.note || "Saved");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ticket failed");
    } finally {
      setBusy(false);
    }
  }

  const hireable = listing.gate === "hireable";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          #{listing.tokenId} · {listing.name}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            hireable
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-white/10 text-white/50"
          }`}
        >
          {hireable ? "Hireable" : "Indexed · not hireable"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-white/40">
        2. Job ticket + live A2A. Probe must pass. One of four jobs only.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] text-white/50">
          Display name *
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-[11px] text-white/50">
          Job SKU *
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as CategoryId)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">Pick one job</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] text-white/50 sm:col-span-2">
          A2A URL *
          <input
            required
            value={a2aUrl}
            onChange={(e) => setA2aUrl(e.target.value)}
            placeholder="https://…/agent-card.json or /a2a"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white"
          />
        </label>
        <label className="block text-[11px] text-white/50">
          You send
          <input
            value={youSend}
            onChange={(e) => setYouSend(e.target.value)}
            placeholder="Wallet, pair, bounds…"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-[11px] text-white/50">
          You get
          <input
            value={youGet}
            onChange={(e) => setYouGet(e.target.value)}
            placeholder="Structured plan, quote…"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-[12px] text-white/60 sm:col-span-2">
          <input
            type="checkbox"
            checked={quoteOnly}
            onChange={(e) => setQuoteOnly(e.target.checked)}
          />
          Quote only — no published $U lock
        </label>
        {!quoteOnly && (
          <label className="block text-[11px] text-white/50">
            Optional lock ($U)
            <input
              value={lockU}
              onChange={(e) => setLockU(e.target.value)}
              placeholder="0.06"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void saveTicket()}
        className="btn-solid mt-4 !h-10 !text-sm disabled:opacity-40"
      >
        {busy ? "Probing A2A…" : "Probe and publish ticket"}
      </button>
      {err && <p className="mt-2 text-xs text-rose-200">{err}</p>}
      {note && <p className="mt-2 text-xs text-emerald-200">{note}</p>}
      {listing.probeError && listing.gate === "indexed" && (
        <p className="mt-2 text-xs text-white/40">
          Last probe: {listing.probeError}
        </p>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Incoming jobs
        </p>
        {jobs.length === 0 ? (
          <p className="mt-1 text-[12px] text-white/40">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {jobs.map((j) => (
              <li key={j.id}>
                <a
                  href={j.href}
                  className="text-[12px] text-amber-200 hover:underline"
                >
                  {j.agentName} · {j.status}
                  {j.escrowStatus ? ` · escrow ${j.escrowStatus}` : ""}
                </a>
                <p className="line-clamp-1 text-[11px] text-white/40">
                  {j.task}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
