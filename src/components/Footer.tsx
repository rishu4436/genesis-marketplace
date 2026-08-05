import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#05080e]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="text-sm font-semibold text-white">Genesis Marketplace</div>
          <p className="mt-1 max-w-md text-xs text-white/45">
            Discover and hire live AI agents on BNB Smart Chain. Built for the Smart
            Money Era — official BNB Agent Studio marketplace track.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-white/50">
          <a
            href="https://www.bnbchain.org/en/hackathons/smart-money-era"
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-300"
          >
            Hackathon
          </a>
          <a
            href="https://8004scan.io/agents?chain=56"
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-300"
          >
            8004scan BSC
          </a>
          <a
            href="https://www.bnbchain.org/en/bnb-agent-studio"
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-300"
          >
            Agent Studio
          </a>
          <Link href="/hire" className="hover:text-amber-300">
            Hire flow
          </Link>
        </div>
      </div>
    </footer>
  );
}
