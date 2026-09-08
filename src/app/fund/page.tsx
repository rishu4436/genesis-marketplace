import Link from "next/link";
import { fundingAddresses } from "@/lib/onchain-hire";
import { NEVER_PAY_SELLER, ESCROW_CTA, SOFT_HIRE_SHORT } from "@/lib/copy";
import { ERC8183_MAINNET } from "@/lib/erc8183-escrow";

export const metadata = {
  title: "Escrow notes · advanced",
};

export const dynamic = "force-dynamic";

export default function FundPage() {
  const f = fundingAddresses();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Advanced
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
        ERC-8183 escrow notes
      </h1>
      <p className="mt-2 text-sm text-white/55">
        This page is documentation. The happy path is the agent page:{" "}
        <strong className="text-white/80">Get plan</strong> (soft hire) or{" "}
        <strong className="text-white/80">Hire with escrow</strong> (in-app
        wallet). You do not need this page to hire.
      </p>

      <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        {NEVER_PAY_SELLER} Seller and controller addresses are identity /
        escrow counterparties, not tip addresses.
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
          <h2 className="text-sm font-semibold text-amber-50">Soft hire (default)</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/60">
            {SOFT_HIRE_SHORT}. Same receipt at{" "}
            <code className="text-white/70">/jobs/&lt;id&gt;</code>.
          </p>
          <Link
            href="/genesis/range-keeper#buy"
            className="mt-3 inline-block text-xs font-semibold text-amber-300 hover:underline"
          >
            Get a RangeKeeper plan →
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white">Escrow hire (optional)</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/60">
            {ESCROW_CTA}
          </p>
          <Link
            href="/genesis/range-keeper?escrow=1#buy"
            className="mt-3 inline-block text-xs font-semibold text-amber-300 hover:underline"
          >
            Open RangeKeeper escrow wizard →
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/50">
        <h2 className="font-semibold text-white/80">Mainnet contracts</h2>
        <p className="mt-1">
          BSC chain 56. Addresses from the BNB Agent Studio / Altana ERC-8183
          registry — not a custom fork.
        </p>
        <ul className="mt-2 space-y-1 font-mono text-[10px] break-all">
          <li>commerce {ERC8183_MAINNET.commerce}</li>
          <li>router {ERC8183_MAINNET.router}</li>
          <li>policy {ERC8183_MAINNET.policy}</li>
          <li>$U {ERC8183_MAINNET.paymentToken}</li>
        </ul>
      </section>

      <details className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Operators / advanced (CLI, studio wallet, faucets)
        </summary>
        <p className="mt-3 text-[12px] text-white/50">
          Studio buyer wallet is an operator tool for{" "}
          <code className="text-white/70">bag erc8183 buy</code>. It is not the
          in-app checkout. Buyers should use the agent-page wizard with their
          own wallet.
        </p>
        <p className="mt-3 text-[11px] text-white/45">
          Buyer project: <code>studio/RangeKeeper</code>
        </p>
        <div className="mt-2 break-all rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-amber-100">
          {f.buyer}
        </div>
        <p className="mt-2 font-mono text-[10px] text-white/40">
          $U token: {f.uToken}
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
        <p className="mt-4 text-[11px] font-semibold text-white/70">
          Seller identities (not pay-to)
        </p>
        <ul className="mt-2 space-y-2 font-mono text-[11px] text-white/45">
          {f.sellers.map((s) => (
            <li key={s.slug}>
              <span className="text-amber-200/80">{s.slug}</span>: {s.address}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-white/45">
          CLI: <code>bag erc8183 buy --provider &lt;seller&gt;</code> then{" "}
          <code>notify_funded</code>. Settle:{" "}
          <code>bag erc8183 settle &lt;job_id&gt; --action approve|dispute</code>
          . Approve only after the 24h window. In-app checkout is the
          RangeKeeper escrow wizard — do not send $U to seller addresses.
        </p>
      </details>
    </div>
  );
}
