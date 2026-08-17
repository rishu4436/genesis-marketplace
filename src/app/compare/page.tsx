import Link from "next/link";
import { getAgentSafe, parseAgentKey, shortAddress } from "@/lib/scan";
import { rankScore } from "@/lib/agent-rank";
import { matchCategory, getCategory } from "@/lib/categories";
import { ComparePicker } from "@/components/ComparePicker";
import type { Agent } from "@/lib/types";
import { hireClassForAgent, hireClassLabel } from "@/lib/hire-class";
import { formatOnchainRating } from "@/lib/feedback-score";
import { compositeFromAxes, computeAxes } from "@/lib/marketplace-score";
import { allGenesisAgents, genesisHref } from "@/lib/genesis-agents";
import { FEATURED_THIRD_PARTY, thirdPartyHref } from "@/lib/third-party-sellers";

export const metadata = {
  title: "Compare agents",
};

type Props = {
  searchParams: Promise<{ ids?: string }>;
};

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = (sp.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const agents: Agent[] = [];
  for (const id of raw) {
    const parsed = parseAgentKey(id);
    if (!parsed) continue;
    const res = await getAgentSafe(parsed.chainId, parsed.tokenId);
    if (res.data) agents.push(res.data);
  }

  const rows: { label: string; values: string[] }[] = [];

  if (agents.length > 0) {
    rows.push({
      label: "Name",
      values: agents.map((a) => a.name || `#${a.token_id}`),
    });
    rows.push({
      label: "Category fit",
      values: agents.map((a) => {
        const id = matchCategory(a.name || "", a.description || "");
        return id ? getCategory(id)?.name || id : "General";
      }),
    });
    rows.push({
      label: "Hire readiness",
      values: agents.map((a) =>
        String(Math.round(compositeFromAxes(computeAxes(a)))),
      ),
    });
    rows.push({
      label: "Genesis fit",
      values: agents.map((a) => {
        const id = matchCategory(a.name || "", a.description || "");
        return rankScore(a, id || undefined).toFixed(0);
      }),
    });
    rows.push({
      label: "On-chain rating",
      values: agents.map((a) => formatOnchainRating(a)),
    });
    rows.push({
      label: "Ratings",
      values: agents.map((a) => String(a.total_feedbacks ?? 0)),
    });
    rows.push({
      label: "Stars",
      values: agents.map((a) => String(a.star_count ?? 0)),
    });
    rows.push({
      label: "Hire class",
      values: agents.map((a) => hireClassLabel(hireClassForAgent(a))),
    });
    rows.push({
      label: "What Buy returns",
      values: agents.map((a) => {
        const c = hireClassForAgent(a);
        if (c === "live") return "Their quote + operator report";
        return "Identity only (no impersonation)";
      }),
    });
    rows.push({
      label: "x402",
      values: agents.map((a) => (a.x402_supported ? "Yes" : "No")),
    });
    rows.push({
      label: "Live A2A",
      values: agents.map((a) => (a.a2a_endpoint ? "Yes" : "No")),
    });
    rows.push({
      label: "Verified",
      values: agents.map((a) => (a.is_verified ? "Yes" : "No")),
    });
    rows.push({
      label: "Owner",
      values: agents.map((a) => shortAddress(a.owner_address, 4)),
    });
    rows.push({
      label: "Token",
      values: agents.map((a) => `${a.chain_id}:${a.token_id}`),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Compare agents
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Compare hire class, fit, and what Buy actually returns — before you
        spend a click. Add cards from the floor (up to 3) or pick a starter
        set.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {allGenesisAgents().map((g) => (
          <Link
            key={g.slug}
            href={genesisHref(g)}
            className="rounded-full border border-white/10 px-3 py-1 text-white/60 hover:border-amber-400/40 hover:text-amber-200"
          >
            {g.name}
          </Link>
        ))}
        <Link
          href={thirdPartyHref(FEATURED_THIRD_PARTY)}
          className="rounded-full border border-sky-400/25 px-3 py-1 text-sky-300 hover:border-sky-400/50"
        >
          {FEATURED_THIRD_PARTY.name}
        </Link>
      </div>

      <ComparePicker initialIds={raw} />

      {agents.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="text-sm text-white/50">
            No agents loaded. Browse the marketplace and tap Compare on cards.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-block text-sm font-medium text-amber-300"
          >
            Go to marketplace →
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-4 py-3 text-xs font-medium text-white/40">
                    Attribute
                  </th>
                  {agents.map((a) => (
                    <th key={a.agent_id || a.token_id} className="px-4 py-3">
                      <Link
                        href={`/agents/${a.chain_id}/${a.token_id}`}
                        className="font-semibold text-amber-200 hover:underline"
                      >
                        {a.name || `#${a.token_id}`}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-white/5 odd:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-xs text-white/40">
                      {row.label}
                    </td>
                    {row.values.map((v, i) => (
                      <td
                        key={`${row.label}-${i}`}
                        className="px-4 py-3 text-white/80"
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {agents.map((a) => (
              <Link
                key={a.agent_id}
                href={`/agents/${a.chain_id}/${a.token_id}`}
                className="rounded-full bg-[#F0B90B] px-4 py-2 text-xs font-semibold text-black hover:bg-amber-300"
              >
                Hire {a.name?.slice(0, 18) || a.token_id} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
