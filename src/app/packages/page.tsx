import Link from "next/link";
import { JOB_PACKAGES, packagePricing } from "@/lib/packages";
import { PackageBuyButton } from "@/components/PackageBuyButton";

export const metadata = {
  title: "Job packages",
  description: "Multi-agent L0 bundles — several plans, no payment.",
};

export default function PackagesPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Multi-agent</p>
      <h1 className="display-section mt-3 text-white">Job packages</h1>
      <p className="lead mt-4 max-w-2xl">
        One L0 run, several specialists. Each agent returns its own plan.
        Listed $ is a SKU, not a charge — same as Get plan. No wallet, no
        escrow unless you open Hire with escrow on a specialist.
      </p>

      <div className="mt-10 space-y-5">
        {JOB_PACKAGES.map((pkg) => {
          const { agents, subtotal, bundleDiscount, total, etaMax } =
            packagePricing(pkg);
          return (
            <article
              key={pkg.id}
              className="panel-strong overflow-hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">
                      {pkg.name}
                    </h2>
                    <p className="mt-1 text-sm text-amber-100/80">
                      {pkg.tagline}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      L0 · no charge
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-white">
                      SKU ${total}
                    </div>
                    <div className="text-[11px] text-white/40">
                      <span className="line-through">${subtotal}</span>
                      {" · "}−${bundleDiscount} listed bundle · ~{etaMax}m
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/55">{pkg.description}</p>

                <ul className="mt-5 space-y-2">
                  {agents.map((a) => (
                    <li
                      key={a.slug}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
                    >
                      <div>
                        <Link
                          href={`/genesis/${a.slug}`}
                          className="text-sm font-semibold text-white hover:text-amber-200"
                        >
                          {a.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-white/45 line-clamp-1">
                          {pkg.tasks[a.slug]}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-white/45">
                        SKU ${a.basePriceUsd}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  <PackageBuyButton packageId={pkg.id} total={total} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="body-sm mt-8">
        Prefer a single agent?{" "}
        <Link href="/browse" className="text-amber-300 hover:underline">
          Get a plan
        </Link>
        .
      </p>
    </div>
  );
}
