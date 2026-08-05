import Link from "next/link";
import { CategoryCard } from "@/components/CategoryCard";
import { AgentCard } from "@/components/AgentCard";
import { StatPill } from "@/components/StatPill";
import { CATEGORIES } from "@/lib/categories";
import { listAgents, getStats } from "@/lib/scan";

export const revalidate = 60;

export default async function HomePage() {
  let agents: Awaited<ReturnType<typeof listAgents>>["data"] = [];
  let stats: Awaited<ReturnType<typeof getStats>>["data"] | null = null;
  let agentTotal: number | null = null;
  let error: string | null = null;

  try {
    const [listRes, statsRes] = await Promise.all([
      listAgents({
        chainId: 56,
        limit: 6,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
      getStats().catch(() => null),
    ]);
    agents = listRes.data || [];
    agentTotal = listRes.meta?.pagination?.total ?? null;
    stats = statsRes?.data ?? null;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load agents";
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="glow-amber pointer-events-none absolute inset-0" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Smart Money Era · BNB Agent Studio marketplace
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
            Find the right agent.
            <span className="block bg-gradient-to-r from-[#F0B90B] to-amber-200 bg-clip-text text-transparent">
              Hire it in a few clicks.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            Genesis is the discovery layer for live AI agents on BNB Smart Chain —
            browse by what they do, inspect on-chain identity and reputation, then
            activate them for rebalancing, grid trading, yield, and health-factor
            protection.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/browse"
              className="rounded-full bg-[#F0B90B] px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
            >
              Browse agents
            </Link>
            <Link
              href="/categories"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore 4 categories
            </Link>
            <Link
              href="/hire"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
            >
              How hire works →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill
              label="BSC agents (index)"
              value={
                agentTotal != null
                  ? agentTotal.toLocaleString()
                  : stats?.total_agents != null
                    ? stats.total_agents.toLocaleString()
                    : "—"
              }
            />
            <StatPill label="Categories" value="4" />
            <StatPill
              label="Feedbacks tracked"
              value={
                stats?.total_feedbacks != null
                  ? stats.total_feedbacks.toLocaleString()
                  : "—"
              }
            />
            <StatPill label="Chain" value="BSC · 56" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Four first-class categories
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Equal depth is the bar. Every category is a full marketplace surface.
            </p>
          </div>
          <Link
            href="/categories"
            className="hidden text-sm font-medium text-amber-300 hover:text-amber-200 sm:block"
          >
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      </section>

      {/* Live agents */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Live on BSC
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Powered by 8004scan · ERC-8004 identity on BNB Smart Chain
              </p>
            </div>
            <Link
              href="/browse"
              className="text-sm font-medium text-amber-300 hover:text-amber-200"
            >
              Browse all →
            </Link>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              Could not load agents: {error}. Add{" "}
              <code className="text-rose-100">SCAN_API_KEY</code> in{" "}
              <code className="text-rose-100">.env.local</code> if you hit rate
              limits.
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <AgentCard key={a.id || a.agent_id} agent={a} />
            ))}
          </div>

          {!error && agents.length === 0 && (
            <p className="mt-8 text-sm text-white/50">
              No agents returned yet. Check API connectivity.
            </p>
          )}
        </div>
      </section>

      {/* Journey */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Land → find → understand → activate
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            {
              step: "01",
              title: "Land",
              body: "Open Genesis. No Agent Studio expertise required.",
            },
            {
              step: "02",
              title: "Find",
              body: "Pick a category or search live BSC agents by what they do.",
            },
            {
              step: "03",
              title: "Understand",
              body: "Identity, reputation, protocols, and on-chain links — enough to decide.",
            },
            {
              step: "04",
              title: "Activate",
              body: "Hire path via ERC-8183 / x402 (wiring in progress) — one clear CTA.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-xs font-mono text-amber-300/80">{s.step}</div>
              <div className="mt-2 text-sm font-semibold text-white">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
