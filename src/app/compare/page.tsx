import Link from "next/link";
import { getAgentSafe, parseAgentKey, shortAddress } from "@/lib/scan";
import { rankScore } from "@/lib/agent-rank";
import { matchCategory, getCategory } from "@/lib/categories";
import { ComparePicker } from "@/components/ComparePicker";
import type { Agent } from "@/lib/types";

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
      label: "Genesis fit score",
      values: agents.map((a) => {
        const id = matchCategory(a.name || "", a.description || "");
        return rankScore(a, id || undefined).toFixed(0);
      }),
    });
    rows.push({
      label: "Avg score",
      values: agents.map((a) =>
        a.average_score && a.average_score > 0
          ? a.average_score.toFixed(2)
          : "—",
      ),
    });
    rows.push({
      label: "Feedbacks",
      values: agents.map((a) => String(a.total_feedbacks ?? 0)),
    });
    rows.push({
      label: "Stars",
      values: agents.map((a) => String(a.star_count ?? 0)),
    });
    rows.push({
      label: "x402",
      values: agents.map((a) => (a.x402_supported ? "Yes" : "No")),
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
        Add agents from the marketplace with the Compare button (up to 3), then
        open this page — or paste chain:token ids below.
      </p>

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
