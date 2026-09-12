/**
 * Job ticket — one schema for Browse, listing, Compare, and /api/v1/agents.
 * What you send, what you get, plan is free, optional $U lock, whether we complete.
 */

import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { matchCategory } from "./categories";
import { sellerPayloadKind, skuForCategory } from "./desk";
import {
  hireClassForAgent,
  matchingGenesisSlug,
  type HireClass,
} from "./hire-class";
import { getGenesisAgent } from "./genesis-agents";
import { getFeaturedByToken, sellerFromAgent } from "./third-party-sellers";
import { listedLockU } from "./erc8183-escrow";

export type JobCompletes = "genesis-apex" | "live-a2a" | "quote-only" | "none";

export type JobTicket = {
  job: string;
  youSend: string;
  youGet: string;
  plan: "free";
  lockU: string | null;
  lockLabel: string;
  completes: JobCompletes;
  completesLabel: string;
  passport: string;
  categoryId: CategoryId | null;
  hireClass: HireClass;
  etaMinutes: number | null;
};

const YOU_SEND: Record<CategoryId, string> = {
  rebalancing: "Pair or LP NFT id if you have one. Else a template plan.",
  "grid-trading": "Pair and price bounds, or we use a recent range.",
  "yield-optimisation": "Asset and size. Else a venue-ranking template.",
  "health-factor": "Wallet for live HF. Else a shock-table template.",
};

function categoryOf(agent: Agent): CategoryId | null {
  const slug = matchingGenesisSlug(agent);
  if (slug) return getGenesisAgent(slug)?.categoryId ?? null;
  const pin = getFeaturedByToken(agent.chain_id, agent.token_id);
  if (pin) return pin.categoryId;
  const census = agent.census_category as CategoryId | undefined;
  if (
    census === "rebalancing" ||
    census === "grid-trading" ||
    census === "yield-optimisation" ||
    census === "health-factor"
  ) {
    return census;
  }
  return matchCategory(agent.name || "", agent.description || "");
}

function passport(agent: Agent): string {
  const name = (agent.name || "").trim() || `Agent #${agent.token_id}`;
  const id = String(agent.token_id || "").trim();
  if (id && /^\d+$/.test(id)) return `${name} · #${id}`;
  return name;
}

export function jobTicketForAgent(agent: Agent): JobTicket {
  const cls = hireClassForAgent(agent);
  const categoryId = categoryOf(agent);
  const sku = categoryId ? skuForCategory(categoryId) : undefined;
  const slug = matchingGenesisSlug(agent) ?? undefined;
  const genesis = slug ? getGenesisAgent(slug) : undefined;
  const pin = getFeaturedByToken(agent.chain_id, agent.token_id);
  const lockU = listedLockU({
    genesisSlug: slug,
    chainId: agent.chain_id,
    tokenId: String(agent.token_id || ""),
  });

  const job = sku?.job || "On-chain identity";
  const youSend = categoryId ? YOU_SEND[categoryId] : "—";

  if (cls === "indexed") {
    return {
      job,
      youSend: "—",
      youGet: "None. Identity only — no hire we can complete.",
      plan: "free",
      lockU: null,
      lockLabel: "—",
      completes: "none",
      completesLabel: "Unhireable",
      passport: passport(agent),
      categoryId,
      hireClass: cls,
      etaMinutes: null,
    };
  }

  if (cls === "genesis") {
    return {
      job,
      youSend,
      youGet: "Structured plan you execute. No custody.",
      plan: "free",
      lockU,
      lockLabel: lockU ? `${lockU} $U optional` : "No published $U",
      completes: "genesis-apex",
      completesLabel: "Genesis APEX · we complete the hire",
      passport: passport(agent),
      categoryId,
      hireClass: cls,
      etaMinutes: genesis?.etaMinutes ?? 2,
    };
  }

  const kind = pin
    ? sellerPayloadKind(pin)
    : agent.quote_only
      ? "quote"
      : sellerFromAgent(agent)
        ? sellerPayloadKind(sellerFromAgent(agent)!)
        : "quote";
  const quoteOnly = kind === "quote";
  const lockFromAgent = agent.list_lock_u || lockU;

  return {
    job,
    youSend: agent.you_send || youSend,
    youGet:
      agent.you_get ||
      (quoteOnly
        ? "A2A quote. Not a completed plan until they deliver."
        : "Their A2A report. Not operated by Genesis."),
    plan: "free",
    lockU: lockFromAgent,
    lockLabel: lockFromAgent ? `${lockFromAgent} $U optional` : "No published $U",
    completes: quoteOnly ? "quote-only" : "live-a2a",
    completesLabel: quoteOnly
      ? "Live A2A · quote only"
      : "Live A2A · we negotiate their endpoint",
    passport: passport(agent),
    categoryId,
    hireClass: cls,
    etaMinutes: 1,
  };
}

export function jobTicketJson(t: JobTicket) {
  return {
    job: t.job,
    youSend: t.youSend,
    youGet: t.youGet,
    plan: t.plan,
    lockU: t.lockU,
    lockLabel: t.lockLabel,
    completes: t.completes,
    completesLabel: t.completesLabel,
    passport: t.passport,
    categoryId: t.categoryId,
    etaMinutes: t.etaMinutes,
  };
}
