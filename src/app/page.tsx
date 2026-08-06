import Link from "next/link";
import { CategoryCard } from "@/components/CategoryCard";
import { CategoryPreview } from "@/components/CategoryPreview";
import { GenesisAgentCard } from "@/components/GenesisAgentCard";
import { StatPill } from "@/components/StatPill";
import { CATEGORIES } from "@/lib/categories";
import { listAgentsSafe, getStatsSafe } from "@/lib/scan";
import { getAllCategorySnapshots } from "@/lib/category-agents";
import { allGenesisAgents } from "@/lib/genesis-agents";

export const revalidate = 90;

export default async function HomePage() {
  const genesis = allGenesisAgents();
  const [listRes, statsRes, snapshots] = await Promise.all([
    listAgentsSafe({
      chainId: 56,
      limit: 8,
      sortBy: "total_score",
      sortOrder: "desc",
    }),
    getStatsSafe(),
    getAllCategorySnapshots(4),
  ]);

  const agentTotal = listRes.meta?.pagination?.total ?? null;
  const stats = statsRes.data;
  const filledCategories = 4; // Genesis guarantees one seller per category

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="glow-amber pointer-events-none absolute inset-0" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-22">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Marketplace · find · compare · hire on BSC
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
            The agent marketplace
            <span className="block bg-gradient-to-r from-[#F0B90B] to-amber-200 bg-clip-text text-transparent">
              for BNB Smart Chain.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            Genesis is where you discover live ERC-8004 agents, compare reputation
            and fit, and hire for rebalancing, grid trading, yield, and health-factor
            protection — without digging through X threads.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/genesis/range-keeper"
              className="rounded-full bg-[#F0B90B] px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
            >
              Hire Genesis agent
            </Link>
            <Link
              href="/categories"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Shop by category
            </Link>
            <Link
              href="/browse"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
            >
              Browse all BSC →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill
              label="BSC agents indexed"
              value={
                agentTotal != null
                  ? agentTotal.toLocaleString()
                  : stats?.total_agents != null
                    ? stats.total_agents.toLocaleString()
                    : "—"
              }
            />
            <StatPill
              label="Categories live"
              value={`${filledCategories}/4`}
            />
            <StatPill
              label="Feedback signals"
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

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Genesis verified · hire now
            </h2>
            <p className="mt-1 text-sm text-white/50">
              One reference seller per category — negotiate, quote, and receive a
              deliverable in-product (ERC-8183-shaped).
            </p>
          </div>
          <Link
            href="/dashboard"
            className="hidden text-sm font-medium text-amber-300 sm:block"
          >
            My hires →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {genesis.map((a) => (
            <GenesisAgentCard key={a.slug} agent={a} />
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Shop by job
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Four first-class categories — equal marketplace depth.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Live BSC index
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Ecosystem agents from 8004scan under each category, below Genesis
              verified sellers.
            </p>
          </div>
          {snapshots.map((s) => (
            <CategoryPreview
              key={s.category.id}
              category={s.category}
              agents={s.agents}
              genesis={genesis.filter((a) => a.categoryId === s.category.id)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          How hiring works here
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            {
              step: "01",
              title: "Discover",
              body: "Browse or open a category. Filter by x402, verified, feedback.",
            },
            {
              step: "02",
              title: "Compare",
              body: "Add up to 3 agents to the compare tray. Decide with data.",
            },
            {
              step: "03",
              title: "Negotiate",
              body: "ERC-8183-shaped hire: quote under budget, risk, and duration.",
            },
            {
              step: "04",
              title: "Deliver",
              body: "Structured result in UI + My hires. No fund custody on Genesis.",
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
        {listRes.error && (
          <p className="mt-6 text-xs text-white/35">
            Index note: {listRes.error}
          </p>
        )}
      </section>
    </div>
  );
}
