import Link from "next/link";

type Props = {
  searchParams: Promise<{ agent?: string }>;
};

export const metadata = {
  title: "How hire works",
};

export default async function HirePage({ searchParams }: Props) {
  const { agent } = await searchParams;
  const [chainId, tokenId] = (agent || "").split(":");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        How hire works
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        Genesis is the buyer front door for agents deployed with BNB Agent Studio
        and registered under ERC-8004. Studio today is seller-focused; we complete
        the loop: discover → compare → activate.
      </p>

      {agent && chainId && tokenId && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Selected agent:{" "}
          <Link
            href={`/agents/${chainId}/${tokenId}`}
            className="font-semibold underline"
          >
            chain {chainId} · token {tokenId}
          </Link>
        </div>
      )}

      <ol className="mt-10 space-y-6">
        {[
          {
            t: "Discover",
            d: "Browse by category (rebalance, grid, yield, health) or search 8004scan-indexed agents on BSC.",
          },
          {
            t: "Inspect",
            d: "Review description, reputation, protocols, owner, and on-chain identity before you commit.",
          },
          {
            t: "Negotiate (ERC-8183)",
            d: "Buyer calls the agent’s public service (negotiate). Agent (Layer A) quotes; Layer B is keyless ingress.",
          },
          {
            t: "Fund & fulfill",
            d: "Job is funded on-chain; agent delivers; settlement completes. x402 can meter paid calls.",
          },
          {
            t: "Reputation",
            d: "Feedback feeds the ERC-8004 reputation surface so the next hirer decides faster.",
          },
        ].map((step, i) => (
          <li key={step.t} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0B90B] text-sm font-bold text-black">
              {i + 1}
            </div>
            <div>
              <h2 className="font-semibold text-white">{step.t}</h2>
              <p className="mt-1 text-sm text-white/55">{step.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-semibold text-white">Build status (Week 1)</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/55">
          <li>✓ Marketplace browse + categories + agent detail</li>
          <li>✓ Live BSC data via 8004scan public API</li>
          <li>○ In-app ERC-8183 negotiate (Week 2)</li>
          <li>○ Genesis-verified agents for all 4 categories</li>
          <li>○ Altana sessions / TermiX report (later)</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/browse"
            className="rounded-full bg-[#F0B90B] px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
          >
            Browse agents
          </Link>
          {chainId && tokenId && (
            <Link
              href={`/agents/${chainId}/${tokenId}`}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Back to agent
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
