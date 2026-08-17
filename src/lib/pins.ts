/**
 * Agent pins — client-safe.
 * Uses a static JSON import (no Node `fs`) so client components can call getPin.
 * Env overrides still apply on the server when present.
 */

import pinsJson from "../../config/pins.json";

export type AgentPin = {
  tokenId?: string;
  chainId?: number;
  serviceUrl?: string;
  walletAddress?: string;
  agentId?: string;
  notes?: string;
  platformSlug?: string;
};

export type PinsFile = {
  network?: string;
  chainId?: number;
  platform_quota?: number;
  agents: Record<string, AgentPin>;
  $schema_note?: string;
};

function loadPinsFile(): PinsFile {
  const parsed = pinsJson as PinsFile;
  return { ...parsed, agents: parsed.agents || {} };
}

function envPin(slug: string): AgentPin {
  const key = slug.replace(/-/g, "_").toUpperCase();
  // NEXT_PUBLIC_ allows optional client-visible overrides; server env still wins in Node
  const pin =
    process.env[`GENESIS_PIN_${key}`] ||
    process.env[`NEXT_PUBLIC_GENESIS_PIN_${key}`];
  const service =
    process.env[`GENESIS_SERVICE_${key}`] ||
    process.env[`NEXT_PUBLIC_GENESIS_SERVICE_${key}`];
  const out: AgentPin = {};
  if (pin) {
    const [c, t] = pin.split(":");
    if (c && t) {
      out.chainId = Number(c);
      out.tokenId = t;
    }
  }
  if (service) out.serviceUrl = service.replace(/\/$/, "");
  return out;
}

/** Merge file pins + env overrides for a slug */
export function getPin(slug: string): AgentPin {
  const file = loadPinsFile();
  const fromFile = file.agents[slug] || {};
  const fromEnv = envPin(slug);
  return {
    ...fromFile,
    ...Object.fromEntries(
      Object.entries(fromEnv).filter(([, v]) => v !== undefined && v !== ""),
    ),
  };
}

export function getPinsFile(): PinsFile {
  return loadPinsFile();
}

export function pinStatus(slug: string): {
  hasToken: boolean;
  hasExternalService: boolean;
  usingLocalApex: boolean;
  pin: AgentPin;
  serviceUrlHint: string;
} {
  const pin = getPin(slug);
  const hasToken = Boolean(pin.tokenId);
  const hasExternalService = Boolean(
    pin.serviceUrl && !pin.serviceUrl.includes("/api/apex/"),
  );
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return {
    hasToken,
    hasExternalService,
    usingLocalApex: !hasExternalService,
    pin,
    serviceUrlHint: pin.serviceUrl || `${base}/api/apex/${slug}`,
  };
}
