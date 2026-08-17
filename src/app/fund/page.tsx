import Link from "next/link";
import { fundingAddresses } from "@/lib/onchain-hire";
import { OnchainHirePanel } from "@/components/OnchainHirePanel";

export const metadata = {
  title: "Fund wallets · on-chain hire",
};

export const dynamic = "force-dynamic";

export default function FundPage() {
  const f = fundingAddresses();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        On-chain fund &amp; settle
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Full ERC-8183 path: create job → set budget → fund (escrow U) → notify
        seller → wait SUBMITTED → fetch deliverable → settle (after 24h dispute
        window for approve).
      </p>

      <section className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
        <h2 className="text-sm font-semibold text-amber-100">
          1) Fund the buyer wallet (required)
        </h2>
        <p className="mt-2 text-xs text-white/60">
          Buyer project: <code className="text-amber-200/90">studio/RangeKeeper</code>{" "}
          wallet (used by <code className="text-amber-200/90">bag erc8183 buy</code>
          ). Need a little <strong className="text-white">tBNB</strong> (for U
          approve) and <strong className="text-white">$U</strong> (payment token).
        </p>
        <div className="mt-3 break-all rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-amber-100">
          {f.buyer}
        </div>
        <p className="mt-2 font-mono text-[10px] text-white/40">
          $U token (commerce paymentToken): {f.uToken}
        </p>
        <ul className="mt-4 space-y-2 text-xs">
          {f.faucets.map((x) => (
            <li key={x.url}>
              <a
                href={x.url}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 hover:underline"
              >
                {x.name} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-white/45">
          Recommended: ≥ 0.05 tBNB and ≥ 0.5 U on the buyer. On testnet many
          ERC-8183 writes are MegaFuel-sponsored; first{" "}
          <code className="text-white/60">approve</code> still needs gas.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Seller wallets</h2>
        <ul className="mt-3 space-y-2 font-mono text-[11px] text-white/55">
          {f.sellers.map((s) => (
            <li key={s.slug}>
              <span className="text-amber-200/80">{s.slug}</span>: {s.address}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white">2) Run on-chain hire</h2>
        <p className="mt-1 text-xs text-white/50">
          After funding, buy a job from a seller (default: YieldRouter). This
          calls <code className="text-white/70">bag erc8183 buy</code> then A2A{" "}
          <code className="text-white/70">notify_funded</code>.
        </p>
        <div className="mt-4">
          <OnchainHirePanel />
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/50">
        <h2 className="font-semibold text-white/80">Settle timing</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            <strong className="text-white/70">approve</strong> only after the
            24h dispute window (chain reverts if early)
          </li>
          <li>
            Within window: use <strong className="text-white/70">dispute</strong>{" "}
            if deliverable is bad
          </li>
          <li>CLI: bag erc8183 settle &lt;job_id&gt; --action approve|dispute</li>
        </ul>
        <Link href="/hire" className="mt-3 inline-block text-amber-300">
          Hire specialists →
        </Link>
      </section>
    </div>
  );
}
