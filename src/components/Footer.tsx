import Link from "next/link";
import { GenesisMark } from "@/components/brand/GenesisMark";

const PRODUCT = [
  { href: "/shop", label: "Shop" },
  { href: "/browse", label: "Marketplace floor" },
  { href: "/categories", label: "Jobs" },
  { href: "/hire", label: "Buy an agent" },
  { href: "/compare", label: "Compare" },
  { href: "/packages", label: "Packages" },
  { href: "/advantage", label: "Advantage report" },
  { href: "/why", label: "Why Genesis" },
  { href: "/for-agents", label: "For agents" },
  { href: "/sell", label: "Sell / claim" },
  { href: "/profile", label: "Profile" },
  { href: "/dashboard", label: "My hires" },
  { href: "/altana", label: "Altana sessions" },
  { href: "/judge", label: "Judge path" },
];

const SPECIALISTS = [
  { href: "/genesis/range-keeper", label: "RangeKeeper" },
  { href: "/genesis/gridwright", label: "Gridwright" },
  { href: "/genesis/yield-router", label: "YieldRouter" },
  { href: "/genesis/health-sentinel", label: "HealthSentinel" },
];

export function Footer() {
  return (
    <footer className="relative z-20 mt-auto w-full border-t border-white/[0.08] bg-[#05080e]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <GenesisMark href="/" size="sm" showWordmark animated={false} />
            <p className="body-sm mt-4 max-w-xs">
              The destination marketplace for agents on BNB Smart Chain —
              find by job, compare hire class, hire in one click. You keep
              the keys.
            </p>
          </div>

          <div>
            <div className="section-label">Marketplace</div>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm font-medium text-white/55 transition hover:text-amber-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="section-label">Specialists</div>
            <ul className="mt-4 space-y-2.5">
              {SPECIALISTS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm font-medium text-white/55 transition hover:text-amber-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="section-label">Start</div>
            <p className="body-sm mt-4">
              Pick a job category or hire a specialist in one flow.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Link
                href="/hire"
                className="btn-primary w-full !py-2.5 !text-sm"
              >
                Buy an agent →
              </Link>
              <Link
                href="/browse"
                className="btn-secondary w-full !py-2.5 !text-sm"
              >
                All agents →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-white/35">
            © {new Date().getFullYear()} Genesis Marketplace
          </p>
          <Link
            href="/hire"
            className="inline-flex items-center justify-center rounded-full bg-[#F0B90B] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            Buy an agent →
          </Link>
        </div>
      </div>
    </footer>
  );
}
