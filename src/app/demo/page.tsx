import Link from "next/link";
import { PLATFORM_LIVE_AGENTS, LOCAL_APEX_AGENTS } from "@/lib/trial";

export const metadata = {
  title: "Demo checklist",
};

const STEPS = [
  {
    t: "Land",
    d: "Open home — 4 categories, Genesis verified shelf, live index.",
    href: "/",
  },
  {
    t: "Find by category",
    d: "Open Rebalancing or Yield — equal-depth shelf with Genesis seller first.",
    href: "/categories/rebalancing",
  },
  {
    t: "Hire live (platform)",
    d: "RangeKeeper / YieldRouter / HealthSentinel → Negotiate & hire → deliverable.",
    href: "/genesis/range-keeper",
  },
  {
    t: "Hire grid (local APEX)",
    d: "Gridwright still hireable while free tier is max 3 cloud agents.",
    href: "/genesis/gridwright",
  },
  {
    t: "My hires",
    d: "Confirm job status delivered + timeline shows ERC-8183-live when platform.",
    href: "/dashboard",
  },
  {
    t: "TermiX report",
    d: "Run 3 with-agent hires, fill without-agent arms, copy markdown.",
    href: "/termix",
  },
  {
    t: "On-chain fund (optional)",
    d: "After tBNB + $U on buyer wallet: /fund → buy → notify → status → settle.",
    href: "/fund",
  },
  {
    t: "Compare",
    d: "Optional: add 2–3 agents to compare tray.",
    href: "/browse",
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Demo checklist
      </h1>
      <p className="mt-2 text-sm text-white/55">
        90-second judge path for Build the Era. Record a screen capture before the
        free platform trial expires (~8 Aug 2026 UTC).
      </p>

      <section className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
        <h2 className="text-sm font-semibold text-amber-100">Pitch (10 sec)</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Genesis is the buyer front door for BNB Agent Studio: discover, compare,
          and hire DeFi agents across rebalancing, grid, yield, and health factor.
          Three sellers run on BNB&apos;s managed Studio cloud (ERC-8004 on testnet);
          the marketplace stays up if the free trial runtime expires — hire falls
          back to local APEX.
        </p>
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">Live sellers</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/65">
          {PLATFORM_LIVE_AGENTS.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/genesis/${a.slug}`}
                className="font-medium text-amber-200 hover:underline"
              >
                {a.name}
              </Link>
              <span className="text-white/40">
                {" "}
                · {a.category} · ERC-8004 {a.tokenId} · platform
              </span>
            </li>
          ))}
          {LOCAL_APEX_AGENTS.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/genesis/${a.slug}`}
                className="font-medium text-amber-200 hover:underline"
              >
                {a.name}
              </Link>
              <span className="text-white/40">
                {" "}
                · {a.category} · local APEX ({a.reason})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-5 text-xs text-white/50">
        <h2 className="font-semibold text-white/80">Before trial ends</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Record 60–90s screen demo of a live platform hire</li>
          <li>Export TermiX markdown from /termix</li>
          <li>If team allows redeploy after expiry: re-run bag deploy + update pins</li>
          <li>Product freeze 31 Aug · submit by 9 Sep</li>
        </ul>
      </section>
    </div>
  );
}
