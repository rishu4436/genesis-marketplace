import Link from "next/link";
import { getAgentSafe, parseAgentKey, shortAddress } from "@/lib/scan";
import { rankScore } from "@/lib/agent-rank";
import { matchCategory, getCategory } from "@/lib/categories";
import { ComparePicker } from "@/components/ComparePicker";
import type { Agent } from "@/lib/types";
import {
  hireClassForAgent,
  hireClassLabel,
  listingHref,
} from "@/lib/hire-class";
import { formatOnchainRating } from "@/lib/feedback-score";
import { compositeFromAxes, computeAxes } from "@/lib/marketplace-score";
import {
  allGenesisAgents,
  genesisHref,
  genesisToAgentCard,
} from "@/lib/genesis-agents";
import { FEATURED_THIRD_PARTY, thirdPartyHref } from "@/lib/third-party-sellers";
import { rankGenesisForJob } from "@/lib/job-rank";
import { scoreAllSpecialists } from "@/lib/receipt-score";
import { listIncidents } from "@/lib/slash-store";

export const metadata = {
  title: "Compare agents",
};

type Props = {
  searchParams: Promise<{ ids?: string; task?: string }>;
};

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const task = (sp.task || "").trim();
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
  if (agents.length === 0 && raw.length === 0 && !task) {
    agents.push(
      ...allGenesisAgents().slice(0, 3).map((g) => genesisToAgentCard(g)),
    );
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
        if (c === "genesis") return "Structured plan you execute";
        if (c === "live") return "Their quote + operator report";
        return "Identity only — not a live hire";
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

  const jobRank = task
    ? rankGenesisForJob(
        task,
        await scoreAllSpecialists(),
        undefined,
        await listIncidents(),
      )
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Compare agents
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Same job, then who can actually complete it. Empty compare loads
        three specialists so you are not staring at a blank tray.
      </p>

      {jobRank && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Same job
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {jobRank.categoryName || "Job"}
          </h2>
          <p className="mt-1 text-sm text-white/55">{jobRank.task}</p>
          <p className="mt-2 text-[11px] text-white/35">
            Organic only · paid rank off
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-xs text-white/40">Specialist</th>
                  <th className="px-3 py-2 text-xs text-white/40">Eligible</th>
                  <th className="px-3 py-2 text-xs text-white/40">Rank</th>
                  <th className="px-3 py-2 text-xs text-white/40">Receipt</th>
                  <th className="px-3 py-2 text-xs text-white/40">Why</th>
                  <th className="px-3 py-2 text-xs text-white/40" />
                </tr>
              </thead>
              <tbody>
                {[...jobRank.organic, ...jobRank.excluded].map((row) => (
                  <tr key={row.slug} className="border-b border-white/5">
                    <td className="px-3 py-2 text-white">{row.name}</td>
                    <td className="px-3 py-2">
                      {row.eligible ? (
                        <span className="text-emerald-300">Yes</span>
                      ) : (
                        <span className="text-white/40">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {row.organicRank ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {row.receipt != null ? row.receipt : "—"}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-white/50">
                      {(row.eligible ? row.why : row.blockers).join(" · ")}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={row.buyHref}
                        className="text-[11px] font-semibold text-amber-300 hover:underline"
                      >
                        Hire
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
        <Link
          href="/compare?task=Rebalance%20my%20PCS%20V3%20LP%20when%20out%20of%20range"
          className="rounded-full border border-emerald-400/25 px-3 py-1 text-emerald-200 hover:border-emerald-400/50"
        >
          Same job · rebalance
        </Link>
        <Link
          href="/compare?task=Protect%20health%20factor%20after%20a%20-15%25%20shock"
          className="rounded-full border border-emerald-400/25 px-3 py-1 text-emerald-200 hover:border-emerald-400/50"
        >
          Same job · health
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
                        href={listingHref(a)}
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
                href={`${listingHref(a)}#buy`}
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
