import Link from "next/link";

const NAV = [
  { href: "/categories", label: "Categories" },
  { href: "/browse", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/dashboard", label: "My hires" },
  { href: "/termix", label: "TermiX" },
  { href: "/demo", label: "Demo" },
  { href: "/fund", label: "On-chain" },
  { href: "/ops", label: "Ops" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070b12]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F0B90B] to-amber-600 text-sm font-bold text-black shadow-lg shadow-amber-500/20">
            G
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-white group-hover:text-amber-200">
              Genesis Marketplace
            </div>
            <div className="hidden text-[10px] uppercase tracking-widest text-white/40 sm:block">
              BNB Agent Studio · BSC
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-lg px-2 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/5 hover:text-white sm:inline-block sm:px-2.5 sm:text-sm md:px-3"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/genesis/range-keeper"
            className="ml-1 rounded-full bg-[#F0B90B] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-300 sm:px-4 sm:text-sm"
          >
            Hire an agent
          </Link>
        </nav>
      </div>
    </header>
  );
}
