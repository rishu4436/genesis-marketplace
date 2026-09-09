import Link from "next/link";
import { readLiveProof } from "@/lib/altana/proof";
import { PartnerStatusStrip } from "@/components/PartnerStatusStrip";
import { DeskStrip } from "@/components/DeskStrip";
import { PROOF_JOBS, bscscanNftUrl, scanAgentUrl } from "@/lib/proof-jobs";
import { allGenesisAgents } from "@/lib/genesis-agents";
import { fetchCensusAlive } from "@/lib/census-alive";
import {
  escrowProofExplorer,
  judgeDemoEmbed,
  judgeDemoVideoUrl,
  resolveEscrowJudgeProof,
  type EscrowJudgeProof,
} from "@/lib/judge-proof";

export const metadata = {
  title: "Judge path",
  description: "Short cold path for Build the Era judges.",
};

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const specialists = allGenesisAgents();
  const [proof, census, escrowProof] = await Promise.all([
    readLiveProof(),
    fetchCensusAlive(),
    resolveEscrowJudgeProof(),
  ]);
  const demoVideo = judgeDemoVideoUrl();
  const demoEmbed = demoVideo ? judgeDemoEmbed(demoVideo) : null;

  return (
    <div className="mx-auto max-w-lg px-5 py-12 sm:px-8">
      <p className="section-label">Judges</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">
        90-second path
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-white/50">
        This is the hire floor, not an explorer. Get plan stays off-chain.
        Optional escrow is live ERC-8183 on{" "}
        <span className="text-white/75">BSC mainnet</span>. Loop: discover →
        plan → optional escrow → prove → rank. Runtime is{" "}
        <span className="text-white/75">Genesis APEX</span> (plan-ready, not
        Studio-live). Identity is ERC-8004 on BSC{" "}
        <span className="text-white/75">#336622–#336625</span>. Altana is a
        post-hire grant with spend caps — never a master key.
      </p>
      <div className="mt-6">
        <DeskStrip compact />
      </div>
      {census.stats.alive > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-white/50">
          BSC register {census.stats.registered.toLocaleString()} identities.
          Public probe:{" "}
          <span className="text-lime-200">
            {census.stats.alive.toLocaleString()} endpoint-alive
          </span>
          . Alive means a declared URL answered — not that Genesis can
          complete the hire. Hireable rows still require A2A we can call
          or a Genesis specialist.{" "}
          <Link
            href="/browse?index=1"
            className="text-amber-300 hover:underline"
          >
            Open the raw index
          </Link>
          .
        </p>
      )}
      <div className="mt-4">
        <PartnerStatusStrip compact />
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href="/genesis/range-keeper?task=Rebalance%20my%20PCS%20V3%20BNB%2FUSDT%20LP%20when%20out%20of%20range#buy"
          className="btn-primary inline-flex !px-5 !py-2.5 !text-sm"
        >
          Judge mode · Get plan
        </Link>
        <Link
          href="/genesis/range-keeper?escrow=1&task=Rebalance%20my%20PCS%20V3%20BNB%2FUSDT%20LP%20when%20out%20of%20range#buy"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-100 hover:border-amber-400/70"
        >
          On-chain escrow · BSC
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-white/40">
        Get plan does not auto-hire. Mainnet lock 56754 is SUBMITTED until 16 Sep
        2026 04:25 UTC — do not call it Settled.
      </p>
      {demoVideo && demoEmbed ? (
        <div className="mt-4">
          {demoEmbed.kind === "youtube" || demoEmbed.kind === "vimeo" ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
              <iframe
                src={demoEmbed.src}
                title="Genesis judge demo"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : demoEmbed.kind === "video" ? (
            <video
              className="w-full rounded-xl border border-white/10"
              src={demoEmbed.src}
              controls
              playsInline
            />
          ) : (
            <a
              href={demoVideo}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-semibold text-amber-300 hover:underline"
            >
              60–90s judge video ↗
            </a>
          )}
          <p className="mt-2 text-[11px] text-white/40">
            Path: home → Hire → RangeKeeper → Get plan → receipt →
            /advantage. Soft-hire receipts below are not ERC-8183 escrow
            proof.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/45">
          60–90s walkthrough not uploaded yet. Set{" "}
          <code className="text-white/60">NEXT_PUBLIC_JUDGE_DEMO_URL</code> or
          <code className="text-white/60"> config/judge-proof.json demoVideoUrl</code>{" "}
          after you record home → Browse → RangeKeeper Get plan → receipt →
          /advantage. Do not invent a link.
        </p>
      )}
      <ol className="mt-8 space-y-3 text-sm text-white/65">
        <li>
          <span className="font-semibold text-white">1.</span>{" "}
          <Link href="/browse" className="text-amber-300 hover:underline">
            Browse
          </Link>{" "}
          — hireable catalog, then RangeKeeper for the 90s plan
        </li>
        <li>
          <span className="font-semibold text-white">2.</span>{" "}
          <Link
            href="/genesis/range-keeper#buy"
            className="text-amber-300 hover:underline"
          >
            RangeKeeper
          </Link>{" "}
          — open Hire, then click Get plan (pass{" "}
          <code className="text-white/70">nft #id</code> to read the PCS
          position)
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
            href="/agents/56/265375#buy"
            className="text-amber-300 hover:underline"
          >
            LP rebalancer #265375
          </Link>
          {" · "}
          <Link
            href="/agents/56/302258#buy"
            className="text-amber-300 hover:underline"
          >
            Brain grid #302258
          </Link>
          {" · "}
          <Link
            href="/agents/56/304493#buy"
            className="text-amber-300 hover:underline"
          >
            Brain yield #304493
          </Link>
          {" · "}
          <Link
            href="/agents/56/302257#buy"
            className="text-amber-300 hover:underline"
          >
            Brain HF #302257
          </Link>
          {" · "}
          <Link
            href="/agents/56/304494#buy"
            className="text-amber-300 hover:underline"
          >
            Brain rebalance #304494
          </Link>
          {" · "}
          <Link
            href="/agents/56/310460#buy"
            className="text-amber-300 hover:underline"
          >
            Brain PCS tier #310460
          </Link>
          {" · "}
          <Link
            href="/agents/56/269223#buy"
            className="text-amber-300 hover:underline"
          >
            ChainHelix rebalance #269223
          </Link>
          {" · "}
          <Link
            href="/agents/56/265876#buy"
            className="text-amber-300 hover:underline"
          >
            Yield optimizer #265876
          </Link>
          {" · "}
          <Link
            href="/agents/56/266933#buy"
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

      <EscrowProofCard proof={escrowProof} />

      {proof ? (
        <div className="mt-8 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
            Altana · Keystore grant
          </p>
          {proof.chainId !== 56 && (
            <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-100">
              Testnet banner · chain {proof.chainId} — not the mainnet prize path
            </p>
          )}
          <p className="mt-1 text-sm text-white">
            {proof.chainId === 56
              ? `${proof.agentName} Keystore grant${proof.revokeTransactionHash ? " + revoke" : ""} on BSC mainnet — this is the Altana track proof.`
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
          {proof.revokeTransactionHash ? (
            <a
              href={`https://bscscan.com/tx/${proof.revokeTransactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 ml-3 inline-block text-xs font-semibold text-amber-300 hover:underline"
            >
              Open revoke tx on BscScan ↗
            </a>
          ) : null}
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
          → Browse → Get plan. No dead end. Soft hire is free. Optional escrow
          is ERC-8183 on BSC mainnet.
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
        Soft-hire proof jobs (2026-09-06)
      </h2>
      <ul className="mt-3 space-y-1.5">
        {(
          [
            ["RangeKeeper", PROOF_JOBS["range-keeper"]],
            ["RangeKeeper (auditor walk)", "job_mtptb9p6_iq2vb1"],
            ["Gridwright", PROOF_JOBS.gridwright],
            ["YieldRouter", PROOF_JOBS["yield-router"]],
            ["HealthSentinel", PROOF_JOBS["health-sentinel"]],
            ["Brain yield (third-party)", "job_mtpky983_et33s0"],
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

function EscrowProofCard({ proof }: { proof: EscrowJudgeProof }) {
  const settled = Boolean(proof.settleTx);
  return (
    <div className="mt-8 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
        {proof.label}
      </p>
      {proof.fundTx ? (
        <>
          <p className="mt-1 text-sm text-white">
            On-chain escrow · BSC 56{" "}
            {settled ? "COMPLETED" : "SUBMITTED, not settled"}
            {proof.onchainJobId ? ` · on-chain job ${proof.onchainJobId}` : ""}
            {proof.marketplaceJobId
              ? ` · receipt ${proof.marketplaceJobId}`
              : ""}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/50">
            {proof.note}
          </p>
          <a
            href={escrowProofExplorer(proof.fundTx, 56) || "#"}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-amber-300 hover:underline"
          >
            Fund tx ↗
          </a>
          {proof.submitTx && (
            <a
              href={escrowProofExplorer(proof.submitTx, 56) || "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-2 ml-3 inline-block text-xs font-semibold text-amber-300 hover:underline"
            >
              Submit tx ↗
            </a>
          )}
          {proof.settleTx && (
            <a
              href={escrowProofExplorer(proof.settleTx, 56) || "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-2 ml-3 inline-block text-xs font-semibold text-amber-300 hover:underline"
            >
              Settle tx ↗
            </a>
          )}
          {proof.marketplaceJobId && (
            <Link
              href={`/jobs/${encodeURIComponent(proof.marketplaceJobId)}`}
              className="mt-2 ml-3 inline-block text-xs font-semibold text-amber-300 hover:underline"
            >
              Open receipt
            </Link>
          )}
        </>
      ) : (
        <p className="mt-1 text-[12px] leading-relaxed text-white/50">
          {proof.note} Start from{" "}
          <Link
            href="/genesis/range-keeper?escrow=1#buy"
            className="text-amber-300 hover:underline"
          >
            RangeKeeper · Hire with escrow
          </Link>
          . Soft-hire jobs are not this proof.
        </p>
      )}
    </div>
  );
}
