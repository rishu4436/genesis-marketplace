import Link from "next/link";
import { HowHireWorks } from "@/components/HowHireWorks";
import { PLATFORM_LIVE_AGENTS, LOCAL_APEX_AGENTS } from "@/lib/trial";

export const metadata = {
  title: "Demo checklist",
};

const STEPS = [
  {
    t: "Land",
    d: "Home: 4 job categories + hire-ready specialists.",
    href: "/",
  },
  {
    t: "Discover",
    d: "Open Rebalancing — By Genesis seller first, then indexed agents with scores.",
    href: "/categories/rebalancing",
  },
  {
    t: "Hire specialist (judge path)",
    d: "RangeKeeper → Negotiate & hire → deliverable in ~30s. No payment.",
    href: "/genesis/range-keeper",
  },
  {
    t: "Hire indexed agent (optional)",
    d: "Browse any card → Hire → soft-hire deliverable. Shows full catalog works.",
    href: "/browse",
  },
  {
    t: "My hires",
    d: "Job status delivered + timeline.",
    href: "/dashboard",
  },
  {
    t: "TermiX report",
    d: "With-agent vs without-agent arms → download .md for submission.",
    href: "/termix",
  },
  {
    t: "Readiness (optional)",
    d: "Dashboard hire-readiness pentagon + per-agent radar on cards.",
    href: "/dashboard#pentagon",
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Demo checklist
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Build the Era · ~90 seconds. Soft hire is the official judge path.
      </p>

      <section className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
        <h2 className="text-sm font-semibold text-amber-100">Pitch (15 sec)</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Genesis is the buyer front door for BNB Agent Studio: discover DeFi
          agents by job type, compare hire readiness, and soft-hire for a
          structured deliverable. Hire-ready sellers are{" "}
          <strong className="text-white">By Genesis</strong> specialists we
          operate. The catalog also indexes the public ERC-8004 graph. Soft hire
          needs no escrow; on-chain fund is optional when policy allows.
        </p>
      </section>

      <div className="mt-6">
        <HowHireWorks />
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Status
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-white/60">
          <li>
            <span className="text-emerald-300">Ready:</span> soft hire (all
            listings), specialists, scores, TermiX, demo path.
          </li>
          <li>
            <span className="text-amber-200">Optional:</span> on-chain
            ERC-8183 escrow on BSC mainnet — soft hire does not lock (see{" "}
            <Link href="/fund" className="text-amber-300 hover:underline">
              /fund
            </Link>
            ).
          </li>
          <li>
            Platform sellers: {PLATFORM_LIVE_AGENTS.join(", ") || "—"}. Local
            APEX: {LOCAL_APEX_AGENTS.join(", ") || "—"}.
          </li>
        </ul>
      </section>

      <ol className="mt-8 space-y-4">
        {STEPS.map((s, i) => (
          <li
            key={s.t}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0B90B] text-sm font-bold text-black">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white">{s.t}</h3>
              <p className="mt-1 text-xs text-white/55">{s.d}</p>
              <Link
                href={s.href}
                className="mt-2 inline-block text-xs font-medium text-amber-300 hover:underline"
              >
                Open →
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-center text-xs text-white/40">
        Fast path:{" "}
        <Link href="/genesis/range-keeper" className="text-amber-300">
          Hire RangeKeeper
        </Link>
        {" · "}
        <Link href="/termix" className="text-amber-300">
          TermiX
        </Link>
        {" · "}
        <Link href="/dashboard" className="text-amber-300">
          My hires
        </Link>
      </p>
    </div>
  );
}
