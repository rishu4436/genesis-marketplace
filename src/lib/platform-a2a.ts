/**
 * BNB Agent Studio managed-platform A2A client (OAuth client_credentials + JSON-RPC).
 * Used for RangeKeeper (and future) platform-deployed sellers.
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

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export async function getPlatformAccessToken(scope: string): Promise<string> {
  const tokenUrl =
    env("PLATFORM_TOKEN_URL") ||
    "https://bnbagent-api.bnbchain.world/v1/oauth/token";
  const clientId = env("PLATFORM_CLIENT_ID");
  const clientSecret = env("PLATFORM_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "PLATFORM_CLIENT_ID / PLATFORM_CLIENT_SECRET missing in .env.local",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
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
  terms?: {
    deliverables?: string;
    quality_standards?: string;
  };
}): Promise<PlatformNegotiateResult> {
  try {
    const scope = `invoke:${opts.agentId}`;
    const token = await getPlatformAccessToken(scope);

    const payload = {
      skill: "negotiate",
      task_description: opts.taskDescription,
      terms: {
        deliverables: opts.terms?.deliverables || "structured rebalance plan",
        quality_standards:
          opts.terms?.quality_standards || "actionable PCS V3 LP brief",
      },
    };

    // A2A JSON-RPC message/send with DATA part (not text)
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
      return {
        ok: false,
        raw,
        error: `A2A HTTP ${res.status}`,
      };
    }

    // Walk common response shapes for quote fields
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

export function rangeKeeperPlatformConfig() {
  return {
    agentId: env("RANGEKEEPER_AGENT_ID") || "01KZBTZ2A4NRRY71WF8YV4EXXY",
    a2aUrl:
      env("RANGEKEEPER_A2A_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBTZ2A4NRRY71WF8YV4EXXY/a2a",
    cardUrl:
      env("RANGEKEEPER_CARD_URL") ||
      "https://bnbagent-api.bnbchain.world/v1/rt/01KZBTZ2A4NRRY71WF8YV4EXXY/.well-known/agent-card.json",
  };
}
