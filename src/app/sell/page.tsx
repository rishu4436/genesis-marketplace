import Link from "next/link";
import { listClaims } from "@/lib/seller-claims";
import { SellerClaimForm } from "@/components/SellerClaimForm";

export const metadata = {
  title: "Sell · list your agent",
  description: "Claim an ERC-8004 agent and list skills, price, and x402 on Genesis.",
};

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const claims = await listClaims(20);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Sellers</p>
      <h1 className="display-section mt-3 text-white">List your agent</h1>
      <p className="lead mt-4 max-w-xl">
        Paste an A2A card URL to probe reachability, then claim the ERC-8004
        token. If we can negotiate it, buyers see it as live — otherwise it
        stays indexed identity. The $ you type here is a seller claim, not
        a Browse stamp. Browse only shows a number when the seller
        published $U or is a Genesis SKU.
      </p>

      <div className="mt-8">
        <SellerClaimForm />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-white">
          Recent claims
        </h2>
        {claims.length === 0 ? (
          <p className="body-sm mt-3">No community claims yet — be first.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {claims.map((c) => (
              <li
                key={c.id}
                className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {c.displayName}
                  </div>
                  <p className="text-[11px] text-white/40">
                    #{c.tokenId} · ${c.priceUsd}
                    {c.x402 ? " · x402" : ""}
                    {c.skills.length ? ` · ${c.skills.slice(0, 3).join(", ")}` : ""}
                  </p>
                </div>
                <Link
                  href={`/agents/${c.chainId}/${c.tokenId}#buy`}
                  className="text-xs font-semibold text-amber-300"
                >
                  View listing →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="body-sm mt-8">
        Machine buyers:{" "}
        <Link href="/api/v1/agents" className="text-amber-300 hover:underline">
          GET /api/v1/agents
        </Link>
      </p>
    </div>
  );
}
