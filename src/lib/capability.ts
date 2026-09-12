/**
 * Honest capability ladder. URL-alive ≠ hire.
 * registered → alive → callable → quote-ready → delivery-ready
 * Only delivery-ready may say Get plan / Hire.
 */

import type { Agent } from "./types";
import {
  isDirectoryLeak,
  isGenesisListing,
  isPublicHireableUrl,
  isDefiJobAgent,
} from "./hire-class";
import {
  getFeaturedByToken,
  isPinnedLiveSeller,
} from "./third-party-sellers";
import { sellerPayloadKind } from "./desk";

export type Capability =
  | "registered"
  | "alive"
  | "callable"
  | "quote-ready"
  | "delivery-ready";

export function capabilityForAgent(agent: Agent): Capability {
  if (isDirectoryLeak(agent)) return "registered";
  if (isGenesisListing(agent)) return "delivery-ready";

  if (agent.desk_live) return "quote-ready";
  if (isPinnedLiveSeller(agent.chain_id, agent.token_id)) {
    return "quote-ready";
  }

  const a2a = agent.a2a_endpoint || "";
  if (isPublicHireableUrl(a2a) && isDefiJobAgent(agent)) return "callable";
  if (agent.probe_status === "alive") return "alive";
  return "registered";
}

/** On the hire floor (Browse default). Not the same as Get plan. */
export function onDesk(agent: Agent): boolean {
  const c = capabilityForAgent(agent);
  return c === "quote-ready" || c === "delivery-ready";
}

export function canRunPlan(agent: Agent): boolean {
  return capabilityForAgent(agent) === "delivery-ready";
}

export function canRequestQuote(agent: Agent): boolean {
  const c = capabilityForAgent(agent);
  return c === "quote-ready" || c === "delivery-ready";
}

export function capabilityBadge(c: Capability): {
  label: string;
  title: string;
} {
  if (c === "delivery-ready") {
    return {
      label: "Can complete",
      title: "We generate a structured plan on this desk.",
    };
  }
  if (c === "quote-ready") {
    return {
      label: "Quote only",
      title: "Live A2A we can call. Not a completed Genesis plan.",
    };
  }
  if (c === "callable") {
    return {
      label: "Callable URL",
      title: "Public A2A shape. Not probed to a schema-valid deliverable.",
    };
  }
  if (c === "alive") {
    return {
      label: "Alive, not a hire",
      title: "Declared URL answered HTTP. Not hireable.",
    };
  }
  return {
    label: "Identity only",
    title: "ERC-8004 name. No hire we can complete.",
  };
}

export function listingCta(agent: Agent): { label: string; hire: boolean } {
  const c = capabilityForAgent(agent);
  if (c === "delivery-ready") return { label: "Get plan", hire: true };
  if (c === "quote-ready") return { label: "Get quote", hire: true };
  return { label: "View identity", hire: false };
}

export function a2aEvidence(agent: Agent): {
  cardUrl: string | null;
  endpoint: string | null;
  lastProbeAt: string | null;
  lastProbeKind: string | null;
  protocols: string[];
} {
  const pin = getFeaturedByToken(agent.chain_id, agent.token_id);
  const card =
    agent.a2a_card_url || pin?.a2aCardUrl || agent.a2a_endpoint || null;
  const endpoint =
    agent.a2a_rpc || pin?.rpcUrl || agent.a2a_endpoint || card;
  const protocols = [
    ...(agent.supported_protocols || []),
    ...(pin ? ["A2A", "ERC-8183"] : []),
  ].filter((v, i, a) => a.indexOf(v) === i);
  const kind =
    agent.last_probe_kind ||
    (pin ? "pin" : agent.probe_status || null);
  return {
    cardUrl: card,
    endpoint,
    lastProbeAt: agent.last_probe_at || null,
    lastProbeKind: kind,
    protocols,
  };
}
