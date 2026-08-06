import { readFileSync, existsSync } from "fs";
import path from "path";

export type AgentPin = {
  tokenId?: string;
  chainId?: number;
  serviceUrl?: string;
  walletAddress?: string;
  agentId?: string;
  notes?: string;
};

export type PinsFile = {
  network?: string;
  chainId?: number;
  agents: Record<string, AgentPin>;
};

function loadPinsFile(): PinsFile {
  try {
    const file = path.join(process.cwd(), "config", "pins.json");
    if (!existsSync(file)) return { agents: {} };
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as PinsFile;
    return { ...parsed, agents: parsed.agents || {} };
  } catch {
    return { agents: {} };
  }
}

function envPin(slug: string): AgentPin {
  const key = slug.replace(/-/g, "_").toUpperCase();
  const pin = process.env[`GENESIS_PIN_${key}`];
  const service = process.env[`GENESIS_SERVICE_${key}`];
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
      Object.entries(fromEnv).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
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
