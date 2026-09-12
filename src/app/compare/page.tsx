import Link from "next/link";
import type { ReactNode } from "react";
import { getAgentSafe, parseAgentKey } from "@/lib/scan";
import { ComparePicker } from "@/components/ComparePicker";
import type { Agent } from "@/lib/types";
import {
  hireClassForAgent,
  isHireableListing,
  listingHref,
  matchingGenesisSlug,
} from "@/lib/hire-class";
import {
  formatOnchainRating,
  hasOnchainRating,
} from "@/lib/feedback-score";
import { compositeFromAxes, computeAxes } from "@/lib/marketplace-score";
import {
  allGenesisAgents,
  genesisToAgentCard,
  getGenesisAgent,
} from "@/lib/genesis-agents";
import { PRICE_LEGEND } from "@/lib/copy";
import {
  getFeaturedByToken,
  resolveCatalogAgent,
} from "@/lib/third-party-sellers";
import { CompareHireAll } from "@/components/CompareHireAll";
import { listingPriceForAgent } from "@/lib/listing-price";
import { jobTicketForAgent } from "@/lib/job-ticket";
import { scoreAllSpecialists } from "@/lib/receipt-score";

export const metadata = {
  title: "Compare agents",
};

type Props = {
  searchParams: Promise<{ ids?: string; task?: string }>;
};

function priceCell(agent: Agent): string {
  const list = listingPriceForAgent(agent);
  if (!list || hireClassForAgent(agent) === "indexed") {
    return "Not for sale";
  }
  if (list.unit === "USD") return `${list.label} SKU · plan · no charge`;
  if (list.unit === "U") return `${list.label} list · plan · no charge`;
  return "Quote on hire · plan · no charge";
}

function ticketCell(agent: Agent) {
  return jobTicketForAgent(agent);
}

function clip(text: string, n = 240): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= n) return t;
  return `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}

function skillLabel(raw: string): string {
  return raw.replace(/[_-]+/g, " ").trim();
}

/** Published tagline / description / skills only — never invented. */
function capabilityCell(agent: Agent): ReactNode {
  const slug = matchingGenesisSlug(agent);
  const genesis = slug ? getGenesisAgent(slug) : undefined;
  const pin = getFeaturedByToken(agent.chain_id, agent.token_id);
  const blurb = clip(
    genesis?.tagline ||
      pin?.tagline ||
      genesis?.description ||
      pin?.description ||
      agent.description ||
      "",
  );
  const skills = (genesis?.skills || [])
    .map(skillLabel)
    .filter(Boolean)
    .slice(0, 4);
  if (skills.length === 0 && pin?.skillId) {
    skills.push(skillLabel(pin.skillId));
  }
  if (!blurb && skills.length === 0) {
    return <span className="text-white/35">No published description</span>;
  }
  return (
    <div className="max-w-[22rem]">
      {blurb ? (
        <p className="text-[13px] leading-relaxed text-white/75">{blurb}</p>
      ) : null}
      {skills.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {skills.map((s) => (
            <li
              key={s}
              className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60"
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function loadCompared(raw: string[]): Promise<Agent[]> {
  const agents: Agent[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    const parsed = parseAgentKey(id);
    if (!parsed) continue;
    const key = `${parsed.chainId}:${parsed.tokenId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const genesis = allGenesisAgents().find(
      (g) =>
        Boolean(g.tokenId) &&
        String(g.tokenId) === String(parsed.tokenId) &&
        Number(g.chainId ?? 56) === parsed.chainId,
    );
    if (genesis) {
      agents.push(genesisToAgentCard(genesis));
      continue;
    }
    const res = await getAgentSafe(parsed.chainId, parsed.tokenId);
    const agent = resolveCatalogAgent(
      parsed.chainId,
      parsed.tokenId,
      res.data,
    );
    if (agent) agents.push(agent);
  }
  return agents;
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const task = (sp.task || "").trim();
  const receiptScores = await scoreAllSpecialists();
  const receiptBySlug = Object.fromEntries(
    receiptScores.map((s) => [s.slug, s.composite]),
  );
  const requested = (sp.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const defaultIds = allGenesisAgents()
    .filter((g) => g.tokenId)
    .slice(0, 3)
    .map((g) => `56:${g.tokenId}`);
  const usingDefault = requested.length === 0;
  const raw = usingDefault ? defaultIds : requested;

  const agents = await loadCompared(raw);

  const rows: { label: string; hint?: string; values: ReactNode[] }[] = [];

  if (agents.length > 0) {
    rows.push({
      label: "What it does",
      hint: "Published tagline, description, and skills. Blank means the seller did not publish any.",
      values: agents.map(capabilityCell),
    });
    rows.push({
      label: "Job",
      values: agents.map((a) => ticketCell(a).job),
    });
    rows.push({
      label: "You send",
      values: agents.map((a) => ticketCell(a).youSend),
    });
    rows.push({
      label: "You get",
      values: agents.map((a) => ticketCell(a).youGet),
    });
    rows.push({
      label: "List price",
      hint: "SKU $ is a label. Get plan is no charge. $U is only shown when the seller published it.",
      values: agents.map(priceCell),
    });
    rows.push({
      label: "Optional lock",
      hint: "Fund $U → deliverable hash on-chain → release after the dispute window.",
      values: agents.map((a) => ticketCell(a).lockLabel),
    });
    rows.push({
      label: "Completes",
      values: agents.map((a) => ticketCell(a).completesLabel),
    });
    rows.push({
      label: "Identity",
      values: agents.map((a) => ticketCell(a).passport),
    });
    rows.push({
      label: "ETA",
      values: agents.map((a) => {
        const m = ticketCell(a).etaMinutes;
        return m != null ? `~${m} min` : "—";
      }),
    });
    rows.push({
      label: "Receipt score",
      hint: "Genesis sealed-hire track record. Blank is not a low score.",
      values: agents.map((a) => {
        const slug = matchingGenesisSlug(a);
        const n = slug ? receiptBySlug[slug] : null;
        return n != null ? String(Math.round(n)) : "—";
      }),
    });
    rows.push({
      label: "Hire readiness",
      hint: "Listing quality on this desk, not an on-chain rating.",
      values: agents.map((a) =>
        String(Math.round(compositeFromAxes(computeAxes(a)))),
      ),
    });
    rows.push({
      label: "Index rating",
      hint: "8004scan Unrated is an index label, not a failed hire.",
      values: agents.map((a) =>
        hasOnchainRating(a)
          ? `${formatOnchainRating(a)}${
              a.total_feedbacks ? ` · ${a.total_feedbacks}` : ""
            }`
          : "Unrated",
      ),
    });
    rows.push({
      label: "x402",
      values: agents.map((a) => (a.x402_supported ? "Yes" : "No")),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Compare agents
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Side-by-side what each agent does, list price, and whether we can
        complete a hire. Opens with three By Genesis specialists. Swap from
        Browse or the chips below. Up to three agents.
      </p>
      <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/40">
        {PRICE_LEGEND} SKU $ is not $U.
      </p>

      {task ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/60">
          Brief: <span className="text-white/85">{task}</span>
        </p>
      ) : null}

      <ComparePicker initialIds={raw} />

      {raw.length < 3 ? (
        <details className="mt-4 text-xs text-white/45">
          <summary className="cursor-pointer select-none hover:text-white/70">
            Add a By Genesis specialist
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {allGenesisAgents()
              .filter((g) => g.tokenId && !raw.includes(`56:${g.tokenId}`))
              .map((g) => {
                const next = [...raw, `56:${g.tokenId}`].slice(0, 3);
                return (
                  <Link
                    key={g.slug}
                    href={`/compare?ids=${next.map(encodeURIComponent).join(",")}`}
                    className="rounded-full border border-amber-400/25 px-3 py-1 text-amber-100 hover:border-amber-400/50"
                  >
                    + {g.name}
                  </Link>
                );
              })}
          </div>
        </details>
      ) : null}

      {usingDefault && agents.length > 0 ? (
        <p className="mt-4 text-[11px] text-white/40">
          Default desk: three By Genesis specialists. Not a ranking.
        </p>
      ) : null}

      {agents.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="text-sm text-white/50">
            Nothing loaded yet. Open Browse, tap Compare on two or three
            cards, then Load from compare tray.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-block text-sm font-medium text-amber-300"
          >
            Go to Browse →
          </Link>
        </div>
      ) : (
        <>
          {task ? <CompareHireAll task={task} agents={agents} /> : null}

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-4 py-3 text-xs font-medium text-white/40">
                    Compare
                  </th>
                  {agents.map((a) => (
                    <th
                      key={a.agent_id || a.token_id}
                      className="px-4 py-3 align-top"
                    >
                      <Link
                        href={listingHref(a)}
                        className="font-semibold text-amber-200 hover:underline"
                      >
                        {a.name || `#${a.token_id}`}
                      </Link>
                      <p className="mt-1 text-[11px] font-normal text-white/40">
                        #{a.token_id}
                      </p>
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
                    <td
                      className="px-4 py-3 text-xs text-white/40"
                      title={row.hint}
                    >
                      {row.label}
                    </td>
                    {row.values.map((v, i) => (
                      <td
                        key={`${row.label}-${i}`}
                        className={`px-4 py-3 align-top ${
                          row.label === "List price"
                            ? "font-semibold tabular-nums text-amber-100"
                            : "text-white/80"
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.04]">
                  <td className="px-4 py-4 text-xs text-white/40">Hire</td>
                  {agents.map((a) => {
                    const can = isHireableListing(a);
                    const list = listingPriceForAgent(a);
                    const label = can
                      ? list?.cta || "Hire"
                      : "View identity";
                    return (
                      <td key={`hire-${a.agent_id || a.token_id}`} className="px-4 py-4">
                        <a
                          href={can ? `${listingHref(a)}#buy` : listingHref(a)}
                          className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${
                            can
                              ? "bg-[#F0B90B] text-black hover:bg-amber-300"
                              : "border border-white/15 bg-white/5 text-white/70 hover:border-white/25"
                          }`}
                        >
                          {label}
                        </a>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
