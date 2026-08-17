import Link from "next/link";
import { SEED_JOBS } from "@/lib/seed-jobs";
import { readLiveProof } from "@/lib/altana/proof";

export const metadata = {
  title: "Judge path",
  description: "Short cold path for Build the Era judges.",
};

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const proof = await readLiveProof();

  return (
    <div className="mx-auto max-w-lg px-5 py-12 sm:px-8">
      <p className="section-label">Judges</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">
        90-second path
      </h1>
      <ol className="mt-8 space-y-3 text-sm text-white/65">
        <li>
          <span className="font-semibold text-white">1.</span>{" "}
          <Link href="/shop" className="text-amber-300 hover:underline">
            Shop
          </Link>{" "}
          — job chip → Buy
        </li>
        <li>
          <span className="font-semibold text-white">2.</span>{" "}
          <Link
            href="/genesis/range-keeper?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            RangeKeeper
          </Link>{" "}
          — buy once
        </li>
        <li>
          <span className="font-semibold text-white">3.</span>{" "}
          <Link href="/advantage" className="text-amber-300 hover:underline">
            Advantage
          </Link>{" "}
          — with vs without
        </li>
        <li>
          <span className="font-semibold text-white">4.</span>{" "}
          <Link href="/altana" className="text-amber-300 hover:underline">
            Altana
          </Link>{" "}
          — scoped session, revoke in-product
        </li>
        <li>
          <span className="font-semibold text-white">5.</span>{" "}
          <Link
            href="/agents/56/265375?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Third-party hire
          </Link>{" "}
          — BNB LP Range Rebalancer (not By Genesis)
        </li>
      </ol>

      {proof ? (
        <div className="mt-8 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
            Altana · live Keystore grant
          </p>
          <p className="mt-1 text-sm text-white">
            {proof.agentName} session on BSC testnet
          </p>
          <p className="mt-1 font-mono text-[10px] text-white/45 break-all">
            wallet {proof.walletAddress}
          </p>
          {proof.transactionHash ? (
            <a
              href={proof.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-amber-300 hover:underline"
            >
              Open grant tx on BscScan ↗
            </a>
          ) : (
            <a
              href={proof.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-amber-300 hover:underline"
            >
              Open wallet on BscScan ↗
            </a>
          )}
        </div>
      ) : (
        <p className="mt-8 text-[11px] text-white/35">
          No live Altana grant recorded yet. Use /altana → Grant session.
        </p>
      )}

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-white/40">
        Criteria map
      </h2>
      <ul className="mt-3 space-y-2 text-[13px] text-white/60">
        <li>
          <span className="font-semibold text-white">Functionality</span> —{" "}
          <Link href="/" className="text-amber-300">
            /
          </Link>{" "}
          chip → Buy → result. No dead end.
        </li>
        <li>
          <span className="font-semibold text-white">Data quality</span> —
          hire class on cards, spam hidden, live operator numbers on #265375.
        </li>
        <li>
          <span className="font-semibold text-white">Diversity</span> —{" "}
          <Link href="/categories" className="text-amber-300">
            four equal shelves
          </Link>{" "}
          + specialists + one live outsider.
        </li>
        <li>
          <span className="font-semibold text-white">TermiX</span> —{" "}
          <Link href="/advantage" className="text-amber-300">
            /advantage
          </Link>
        </li>
        <li>
          <span className="font-semibold text-white">PancakeSwap</span> —
          RangeKeeper plans + live BNB/USDT LP report.
        </li>
        <li>
          <span className="font-semibold text-white">Machine buyers</span> —{" "}
          <Link href="/for-agents" className="text-amber-300">
            /for-agents
          </Link>{" "}
          · GET /api/v1/agents
        </li>
      </ul>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-white/40">
        Seeded results
      </h2>
      <ul className="mt-3 space-y-1.5">
        {SEED_JOBS.map((j) => (
          <li key={j.id}>
            <Link
              href={`/jobs/${encodeURIComponent(j.id)}`}
              className="text-sm text-white/70 hover:text-amber-300"
            >
              {j.agentName} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
