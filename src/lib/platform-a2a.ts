/**
 * BNB Agent Studio managed-platform A2A client (OAuth client_credentials + JSON-RPC).
 */

export type PlatformNegotiateResult = {
  ok: boolean;
  raw: unknown;
  price?: string | number;
  price_usd?: number;
  currency?: string;
  provider_sig?: string;
  negotiation_hash?: string;
  error?: string;
};

export type PlatformAgentConfig = {
  slug: string;
  agentId: string;
  a2aUrl: string;
  cardUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** All Genesis slugs that may have platform deploys */
export const PLATFORM_AGENT_MAP: Record<string, PlatformAgentConfig> = {
  "range-keeper": {
    slug: "range-keeper",
    agentId: env("RANGEKEEPER_AGENT_ID") || "01KZBTZ2A4NRRY71WF8YV4EXXY",
    a2aUrl:
      env("RANGEKEEPER_A2A_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBTZ2A4NRRY71WF8YV4EXXY/a2a",
    cardUrl:
      env("RANGEKEEPER_CARD_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBTZ2A4NRRY71WF8YV4EXXY/.well-known/agent-card.json",
    clientIdEnv: "RANGEKEEPER_CLIENT_ID",
    clientSecretEnv: "RANGEKEEPER_CLIENT_SECRET",
  },
  gridwright: {
    slug: "gridwright",
    agentId: env("GRIDWRIGHT_AGENT_ID") || "",
    a2aUrl: env("GRIDWRIGHT_A2A_URL") || "",
    cardUrl: env("GRIDWRIGHT_CARD_URL") || "",
    clientIdEnv: "GRIDWRIGHT_CLIENT_ID",
    clientSecretEnv: "GRIDWRIGHT_CLIENT_SECRET",
  },
  "yield-router": {
    slug: "yield-router",
    agentId: env("YIELDROUTER_AGENT_ID") || "01KZBXKNH3VKHHE3YCH1K496A9",
    a2aUrl:
      env("YIELDROUTER_A2A_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBXKNH3VKHHE3YCH1K496A9/a2a",
    cardUrl:
      env("YIELDROUTER_CARD_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBXKNH3VKHHE3YCH1K496A9/.well-known/agent-card.json",
    clientIdEnv: "YIELDROUTER_CLIENT_ID",
    clientSecretEnv: "YIELDROUTER_CLIENT_SECRET",
  },
  "health-sentinel": {
    slug: "health-sentinel",
    agentId: env("HEALTHSENTINEL_AGENT_ID") || "01KZBXTNSPVX052KK69RPWJMN8",
    a2aUrl:
      env("HEALTHSENTINEL_A2A_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBXTNSPVX052KK69RPWJMN8/a2a",
    cardUrl:
      env("HEALTHSENTINEL_CARD_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBXTNSPVX052KK69RPWJMN8/.well-known/agent-card.json",
    clientIdEnv: "HEALTHSENTINEL_CLIENT_ID",
    clientSecretEnv: "HEALTHSENTINEL_CLIENT_SECRET",
  },
};

export function getPlatformConfig(
  genesisSlug: string,
): PlatformAgentConfig | null {
  const cfg = PLATFORM_AGENT_MAP[genesisSlug];
  if (!cfg?.agentId || !cfg.a2aUrl) return null;
  return cfg;
}

export async function getPlatformAccessToken(
  scope: string,
  clientId?: string,
  clientSecret?: string,
): Promise<string> {
  const tokenUrl =
    env("PLATFORM_TOKEN_URL") ||
    "https://bnbagent-api.bnbchain.world/v1/oauth/token";
  const id =
    clientId ||
    env("PLATFORM_CLIENT_ID") ||
    env("RANGEKEEPER_CLIENT_ID");
  const secret =
    clientSecret ||
    env("PLATFORM_CLIENT_SECRET") ||
    env("RANGEKEEPER_CLIENT_SECRET");
  if (!id || !secret) {
    throw new Error(
      "Platform OAuth client missing (PLATFORM_CLIENT_ID/SECRET or per-agent CLIENT_*)",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
    scope,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        `OAuth token failed (${res.status})`,
    );
  }
  return json.access_token;
}

export async function a2aNegotiate(opts: {
  a2aUrl: string;
  agentId: string;
  taskDescription: string;
  clientId?: string;
  clientSecret?: string;
  terms?: {
    deliverables?: string;
    quality_standards?: string;
  };
}): Promise<PlatformNegotiateResult> {
  try {
    const scope = `invoke:${opts.agentId}`;
    const token = await getPlatformAccessToken(
      scope,
      opts.clientId,
      opts.clientSecret,
    );

    const payload = {
      skill: "negotiate",
      task_description: opts.taskDescription,
      terms: {
        deliverables: opts.terms?.deliverables || "structured brief",
        quality_standards:
          opts.terms?.quality_standards || "marketplace hire",
      },
    };

    const rpc = {
      jsonrpc: "2.0",
      id: `neg-${Date.now()}`,
      method: "message/send",
      params: {
        message: {
          role: "user",
          parts: [{ kind: "data", data: payload }],
        },
      },
    };

    const res = await fetch(opts.a2aUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(rpc),
      cache: "no-store",
    });

    const raw = await res.json().catch(async () => ({
      text: await res.text().catch(() => ""),
    }));

    if (!res.ok) {
      return { ok: false, raw, error: `A2A HTTP ${res.status}` };
    }

    const flat = JSON.stringify(raw);
    const pick = (key: string): string | undefined => {
      const m = flat.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
      return m?.[1];
    };
    const pickNum = (key: string): number | undefined => {
      const m = flat.match(new RegExp(`"${key}"\\s*:\\s*([0-9.eE+-]+)`));
      return m ? Number(m[1]) : undefined;
    };

    return {
      ok: true,
      raw,
      price: pick("price") ?? pickNum("price"),
      currency: pick("currency"),
      provider_sig: pick("provider_sig") || pick("providerSig"),
      negotiation_hash: pick("negotiation_hash") || pick("negotiationHash"),
    };
  } catch (e) {
    return {
      ok: false,
      raw: null,
      error: e instanceof Error ? e.message : "A2A negotiate failed",
    };
  }
}

/** @deprecated use getPlatformConfig */
export function rangeKeeperPlatformConfig() {
  return getPlatformConfig("range-keeper")!;
}
