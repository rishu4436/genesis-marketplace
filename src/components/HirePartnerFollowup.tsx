import Link from "next/link";
import { advantageHrefForHire } from "@/lib/advantage-report";

export function HirePartnerFollowup({
  jobId,
  genesisSlug,
  categoryId,
  chainId,
  tokenId,
}: {
  jobId?: string;
  genesisSlug?: string;
  categoryId?: string | null;
  chainId: number;
  tokenId: string;
}) {
  const advantage = advantageHrefForHire({ genesisSlug, categoryId });
  const altana = genesisSlug ? `/genesis/${genesisSlug}#altana` : "/altana";
  const scan =
    tokenId && String(tokenId) !== "0"
      ? `https://8004scan.io/agents/bsc/${tokenId}`
      : "https://8004scan.io";

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
        After this hire
      </p>
      <p className="mt-1 text-[12px] text-white/50">
        Partners sit on the same receipt — not a separate demo track.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Link
          href={advantage}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 hover:border-amber-400/30"
        >
          <span>
            <span className="font-semibold text-white">TermiX advantage</span>
            <span className="mt-0.5 block text-[11px] text-white/40">
              With vs without this job type
            </span>
          </span>
          <span className="text-amber-300">→</span>
        </Link>
        <Link
          href={altana}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 hover:border-violet-400/30"
        >
          <span>
            <span className="font-semibold text-white">Altana session</span>
            <span className="mt-0.5 block text-[11px] text-white/40">
              Scoped grant for this specialist · not the buy path
            </span>
          </span>
          <span className="text-amber-300">→</span>
        </Link>
        <Link
          href={scan}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 hover:border-sky-400/30"
        >
          <span>
            <span className="font-semibold text-white">8004scan identity</span>
            <span className="mt-0.5 block text-[11px] text-white/40">
              On-chain registration for #{tokenId}
            </span>
          </span>
          <span className="text-amber-300">↗</span>
        </Link>
        {(genesisSlug === "range-keeper" || categoryId === "rebalancing") && (
          <Link
            href="/partners#pancakeswap"
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 hover:border-amber-400/30"
          >
            <span>
              <span className="font-semibold text-white">PancakeSwap slot0</span>
              <span className="mt-0.5 block text-[11px] text-white/40">
                Live V3 tick used in the plan when RPC answers
              </span>
            </span>
            <span className="text-amber-300">→</span>
          </Link>
        )}
      </div>
      {jobId && (
        <p className="mt-3 text-[11px] text-white/35">
          Receipt {jobId} ·{" "}
          <Link href="/partners" className="text-amber-300/80 hover:underline">
            all partner status
          </Link>
        </p>
      )}
    </section>
  );
}
