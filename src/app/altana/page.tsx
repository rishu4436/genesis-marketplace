import { AltanaPanel } from "@/components/AltanaPanel";
import { allPolicies } from "@/lib/altana/policies";
import { altanaStatus } from "@/lib/altana/client";
import { readLiveProof } from "@/lib/altana/proof";
import Link from "next/link";

export const metadata = {
  title: "Altana sessions",
  description:
    "Scoped, revocable agent permissions via Altana Keystore — hackathon partner track.",
};

export const dynamic = "force-dynamic";

export default async function AltanaPage() {
  const status = altanaStatus();
  const policies = allPolicies();
  const proof = await readLiveProof();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Partner · Altana</p>
      <h1 className="display-section mt-3 text-white">
        Session keys you control
      </h1>
      <p className="lead mt-4 max-w-2xl">
        This page is the Altana partner track. It is not the hire path.
        A hire on Genesis returns a plan under a spend-0 session. Here you
        may optionally grant a Keystore session with{" "}
        <strong className="text-white/80">spend caps</strong>,{" "}
        <strong className="text-white/80">allowlists</strong>, and{" "}
        <strong className="text-white/80">expiry</strong> — then revoke it
        in-product. Testnet counts; a BSC mainnet grant is the prize proof.
      </p>

      <div className="panel mt-8 grid gap-3 sm:grid-cols-3">
        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Network
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {status.network} · {status.chainId}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Mode
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${
              proof?.transactionHash || status.liveCapable
                ? "text-emerald-300"
                : "text-amber-200"
            }`}
          >
            {proof?.transactionHash ? "live" : status.mode}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Docs
          </div>
          <a
            href={status.docs}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm font-semibold text-amber-300 hover:underline"
          >
            docs.altana.network ↗
          </a>
        </div>
      </div>

      <p className="body-sm mt-4 text-white/45">{status.note}</p>
      {status.adminAddress && (
        <p className="mt-1 font-mono text-[11px] text-white/40 break-all">
          admin {status.adminAddress}
        </p>
      )}
      {proof && (
        <div className="mt-6 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
            Last live grant
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {proof.agentName} · chain {proof.chainId}
          </p>
          <p className="mt-1 font-mono text-[10px] text-white/45 break-all">
            wallet {proof.walletAddress}
          </p>
          {proof.transactionHash && (
            <p className="mt-1 font-mono text-[10px] text-emerald-300/80 break-all">
              tx {proof.transactionHash}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            <a
              href={proof.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-amber-300 hover:underline"
            >
              Grant on BscScan ↗
            </a>
            <a
              href={proof.keystoreExplorer}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-violet-200 hover:underline"
            >
              Keystore ↗
            </a>
          </div>
        </div>
      )}
      {status.network === "bnb-testnet" && (
        <p className="mt-2 text-xs text-white/40">
          Faucet:{" "}
          <a
            href={status.faucet}
            className="text-amber-300 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            tBNB faucet
          </a>
        </p>
      )}

      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-white">
          Specialist policies
        </h2>
        <p className="body-sm mt-2">
          Each Genesis agent ships a default session template — grant from here
          or the agent page.
        </p>
        <div className="mt-5 space-y-3">
          {policies.map((p) => (
            <div key={p.agentSlug} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">{p.title}</h3>
                  <p className="mt-1 text-xs text-white/50">{p.description}</p>
                </div>
                <Link
                  href={`/genesis/${p.agentSlug}#altana`}
                  className="text-xs font-semibold text-amber-300"
                >
                  Open agent →
                </Link>
              </div>
              <ul className="mt-3 space-y-1 text-[11px] text-white/45">
                {p.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <AltanaPanel />
      </div>

      <section className="mt-12 rounded-xl border border-white/10 bg-black/30 p-5 text-xs text-white/45">
        <p className="font-semibold text-white/70">Hackathon track checklist</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Agents get scoped sessions (allowlist + spend + expiry)</li>
          <li>User can view permissions and revoke in-product</li>
          <li>
            Live grant writes Keystore when the admin key is set and the EOA has
            BNB (mainnet) or tBNB (testnet) — failures do not fall back to demo
          </li>
          <li>
            Last live tx is saved to{" "}
            <code className="text-amber-200/80">config/altana-proof.json</code>{" "}
            and shown on /judge
          </li>
        </ul>
      </section>
    </div>
  );
}
