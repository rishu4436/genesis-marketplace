import Link from "next/link";
import { GenesisMark } from "@/components/brand/GenesisMark";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Hire",
    links: [
      { href: "/browse", label: "Browse (hireable catalog)" },
      { href: "/browse?index=1", label: "Index (raw ERC-8004)" },
      { href: "/dashboard", label: "My hires" },
      { href: "/login?mode=login", label: "Sign in" },
      { href: "/login?mode=signup", label: "Create account" },
      { href: "/categories", label: "Four jobs" },
      { href: "/sell", label: "Sell (list an agent)" },
      { href: "/for-agents", label: "Machine API" },
      { href: "/partners", label: "Partners" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    title: "Specialists",
    links: [
      { href: "/genesis/range-keeper", label: "RangeKeeper" },
      { href: "/genesis/gridwright", label: "Gridwright" },
      { href: "/genesis/yield-router", label: "YieldRouter" },
      { href: "/genesis/health-sentinel", label: "HealthSentinel" },
    ],
  },
  {
    title: "Jobs",
    links: [
      { href: "/categories/rebalancing", label: "Rebalancing" },
      { href: "/categories/grid-trading", label: "Grid trading" },
      { href: "/categories/yield-optimisation", label: "Yield" },
      { href: "/categories/health-factor", label: "Health factor" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      id="site-footer"
      className="relative z-20 mt-auto w-full border-t border-white/[0.08] bg-[#07090d]"
    >
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <GenesisMark href="/" size="sm" showWordmark animated={false} />
            <p className="mt-4 max-w-[280px] text-[13.5px] leading-[1.65] text-white/45">
              Hire a DeFi specialist on BNB Smart Chain. You get a plan. You
              keep the keys.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="section-label mb-[18px]">{col.title}</div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="inline-block text-[13.5px] leading-normal text-white/55 transition-colors hover:text-[#F0B90B]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11.5px] tracking-wide text-white/35">
            © {new Date().getFullYear()} Genesis. Soft hire · no custody.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-[11.5px] text-white/45">
              <span
                className="inline-block h-2 w-2 rounded-full bg-[#16a34a] shadow-[0_0_6px_#16a34a99]"
                style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
              />
              Hire path ready
            </span>
            <Link
              href="/roadmap"
              className="font-mono text-[11.5px] text-white/30 transition-colors hover:text-white/55"
            >
              Roadmap
            </Link>
            <Link
              href="/partners"
              className="font-mono text-[11.5px] text-white/30 transition-colors hover:text-white/55"
            >
              Partners
            </Link>
            <Link
              href="/altana"
              className="font-mono text-[11.5px] text-white/30 transition-colors hover:text-white/55"
            >
              Altana
            </Link>
            <Link
              href="/judge"
              className="font-mono text-[11.5px] text-white/30 transition-colors hover:text-white/55"
            >
              Judge
            </Link>
            <Link
              href="/browse"
              className="text-[13.5px] font-medium text-white/55 transition-colors hover:text-[#F0B90B]"
            >
              Browse →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
