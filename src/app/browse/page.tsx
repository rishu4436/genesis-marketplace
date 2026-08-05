import { AgentCard } from "@/components/AgentCard";
import { listAgents, searchAgents, dedupeAgents } from "@/lib/scan";
import type { Agent } from "@/lib/types";
import Link from "next/link";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function BrowsePage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1") || 1);
  const limit = 24;

  let agents: Agent[] = [];
  let total: number | null = null;
  let hasMore = false;
  let error: string | null = null;

  try {
    if (q) {
      const res = await searchAgents({ q, limit, chainId: 56 });
      agents = dedupeAgents(res.data || []);
      total = agents.length;
      hasMore = false;
    } else {
      const res = await listAgents({
        chainId: 56,
        page,
        limit,
        sortBy: "total_score",
        sortOrder: "desc",
      });
      agents = res.data || [];
      total = res.meta?.pagination?.total ?? null;
      hasMore = Boolean(res.meta?.pagination?.hasMore);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Browse agents
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Live ERC-8004 agents on BNB Smart Chain (chainId 56), indexed via
          8004scan.
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-3 sm:flex-row" action="/browse">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, skill, or job… e.g. yield, grid, liquidation"
          className="w-full flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none ring-amber-400/40 focus:ring-2"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#F0B90B] px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {["rebalancing", "grid trading", "yield", "health factor", "PancakeSwap"].map(
          (chip) => (
            <Link
              key={chip}
              href={`/browse?q=${encodeURIComponent(chip)}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60 transition hover:border-amber-400/40 hover:text-amber-200"
            >
              {chip}
            </Link>
          ),
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-white/45">
        <span>
          {error
            ? "—"
            : q
              ? `${agents.length} result${agents.length === 1 ? "" : "s"} for “${q}”`
              : total != null
                ? `${total.toLocaleString()} agents · page ${page}`
                : `${agents.length} agents`}
        </span>
        <Link href="/categories" className="text-amber-300 hover:text-amber-200">
          Browse by category →
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <AgentCard key={a.id || a.agent_id} agent={a} />
        ))}
      </div>

      {!error && agents.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/50">
          No agents matched. Try another query or browse categories.
        </p>
      )}

      {!q && (page > 1 || hasMore) && (
        <div className="mt-10 flex justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/browse?page=${page - 1}`}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              ← Previous
            </Link>
          )}
          {hasMore && (
            <Link
              href={`/browse?page=${page + 1}`}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
