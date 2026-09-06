import Link from "next/link";
import { readLiveProof } from "@/lib/altana/proof";
import { PartnerStatusStrip } from "@/components/PartnerStatusStrip";
import { PROOF_JOBS, bscscanNftUrl, scanAgentUrl } from "@/lib/proof-jobs";
import { allGenesisAgents } from "@/lib/genesis-agents";

export const metadata = {
  title: "Judge path",
  description: "Short cold path for Build the Era judges.",
};

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const proof = await readLiveProof();
  const specialists = allGenesisAgents();

  return (
    <div className="mx-auto max-w-lg px-5 py-12 sm:px-8">
      <p className="section-label">Judges</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">
        90-second path
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-white/50">
        Hire runs on{" "}
        <span className="text-white/75">Genesis APEX</span> (Ready, not
        Studio-live) until Bedrock AgentCore quota lands. Specialists are{" "}
        <span className="text-white/75">ERC-8004 on BSC mainnet</span>
        {" "}#336622–#336625. Hire is plan-only; optional escrow is mainnet
        ERC-8183. Altana is a post-hire grant on the same specialist.
      </p>
      <div className="mt-6">
        <PartnerStatusStrip compact />
      </div>
      <ol className="mt-8 space-y-3 text-sm text-white/65">
        <li>
          <span className="font-semibold text-white">1.</span>{" "}
          <Link href="/hire" className="text-amber-300 hover:underline">
            Hire
          </Link>{" "}
          — pick RangeKeeper
        </li>
        <li>
          <span className="font-semibold text-white">2.</span>{" "}
          <Link
            href="/genesis/range-keeper?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            RangeKeeper
          </Link>{" "}
          — buy once (pass <code className="text-white/70">nft #id</code> to
          read the PCS position)
        </li>
        <li>
          <span className="font-semibold text-white">3.</span>{" "}
          <Link href="/advantage" className="text-amber-300 hover:underline">
            Advantage
          </Link>{" "}
          — with vs without, live receipts
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
            LP rebalancer #265375
          </Link>
          {" · "}
          <Link
            href="/agents/56/302258?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Brain grid #302258
          </Link>
          {" · "}
          <Link
            href="/agents/56/304493?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Brain yield #304493
          </Link>
          {" · "}
          <Link
            href="/agents/56/302257?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Brain HF #302257
          </Link>
          {" · "}
          <Link
            href="/agents/56/304494?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Brain rebalance #304494
          </Link>
          {" · "}
          <Link
            href="/agents/56/310460?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Brain PCS tier #310460
          </Link>
          {" · "}
          <Link
            href="/agents/56/269223?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            ChainHelix rebalance #269223
          </Link>
          {" · "}
          <Link
            href="/agents/56/265876?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Yield optimizer #265876
          </Link>
          {" · "}
          <Link
            href="/agents/56/266933?buy=1#buy"
            className="text-amber-300 hover:underline"
          >
            Lending guardian #266933
          </Link>{" "}
          — not By Genesis
        </li>
        <li>
          <span className="font-semibold text-white">6.</span>{" "}
          <Link href="/partners" className="text-amber-300 hover:underline">
            Partners
          </Link>{" "}
          — 8004scan, Altana, TermiX, PancakeSwap, live A2A probes
        </li>
      </ol>

      {proof ? (
        <div className="mt-8 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
            Altana · Keystore grant
          </p>
          <p className="mt-1 text-sm text-white">
            {proof.chainId === 56
              ? `${proof.agentName} Keystore grant on BSC mainnet — this is the Altana track proof.`
              : `${proof.agentName} historical testnet grant — marketplace hire is BSC mainnet. A mainnet grant is the stronger Altana proof.`}
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
        Mainnet ERC-8004
      </h2>
      <ul className="mt-3 space-y-1.5 text-[13px] text-white/60">
        {specialists.map((g) => (
          <li key={g.slug}>
            {g.name} #{g.tokenId || "pending"} ·{" "}
            {g.tokenId ? (
              <>
                <a
                  href={bscscanNftUrl(g.tokenId)}
                  className="text-amber-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  BscScan
                </a>
                {" · "}
                <a
                  href={scanAgentUrl(56, g.tokenId)}
                  className="text-amber-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  8004scan index
                </a>
              </>
            ) : (
              "pin missing"
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-white/40">
        Criteria map
      </h2>
      <ul className="mt-3 space-y-2 text-[13px] text-white/60">
        <li>
          <span className="font-semibold text-white">Functionality</span> —{" "}
          <Link href="/" className="text-amber-300">
            /
          </Link>{" "}
          → hire → plan. No dead end. Soft hire is free; escrow is optional
          mainnet ERC-8183.
        </li>
        <li>
          <span className="font-semibold text-white">Data quality</span> —
          hashed receipt{" "}
          <Link
            href={`/jobs/${PROOF_JOBS["range-keeper"]}`}
            className="text-amber-300"
          >
            RangeKeeper today
          </Link>
          , PCS slot0 + Venus on the plan, ERC-8004 #336622.
        </li>
        <li>
          <span className="font-semibold text-white">Diversity</span> —{" "}
          <Link href="/categories" className="text-amber-300">
            four equal shelves
          </Link>{" "}
          + specialists + pinned outsiders (#265375 LP, #304494 rebalance,
          #302258 grid, #304493 yield, #310460 PCS tier, #302257 health).
        </li>
        <li>
          <span className="font-semibold text-white">TermiX</span> —{" "}
          <Link href="/advantage" className="text-amber-300">
            /advantage
          </Link>{" "}
          four tasks, live job ids, operator-timed DIY labeled as such.
        </li>
        <li>
          <span className="font-semibold text-white">Machine buyers</span> —{" "}
          <Link href="/for-agents" className="text-amber-300">
            /for-agents
          </Link>{" "}
          · GET /api/v1/agents · POST /api/v1/hire
        </li>
      </ul>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-white/40">
        Live proof jobs (2026-09-06)
      </h2>
      <ul className="mt-3 space-y-1.5">
        {(
          [
            ["RangeKeeper", PROOF_JOBS["range-keeper"]],
            ["Gridwright", PROOF_JOBS.gridwright],
            ["YieldRouter", PROOF_JOBS["yield-router"]],
            ["HealthSentinel", PROOF_JOBS["health-sentinel"]],
          ] as const
        ).map(([name, id]) => (
          <li key={id}>
            <Link
              href={`/jobs/${id}`}
              className="text-sm text-white/70 hover:text-amber-300"
            >
              {name} → {id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
