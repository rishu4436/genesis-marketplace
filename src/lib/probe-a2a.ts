/**
 * Probe a public A2A URL. Reachable card/RPC ≠ hireable by itself.
 */

import { isPublicHireableUrl } from "./hire-class";

function ssrfBlocked(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "Invalid URL";
  }
  if (u.protocol !== "https:") return "https required";
  if (u.username || u.password) return "URL credentials blocked";
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1"
  ) {
    return "blocked host";
  }
  if (host.endsWith(".internal") || host.includes("metadata")) {
    return "blocked host";
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return "private IP";
    if (a === 169 && b === 254) return "link-local IP";
    if (a === 192 && b === 168) return "private IP";
    if (a === 172 && b >= 16 && b <= 31) return "private IP";
    if (a === 100 && b >= 64 && b <= 127) return "shared IP";
  }
  return null;
}

export type A2aProbe = {
  ok: boolean;
  probed?: string;
  name?: string;
  description?: string;
  kind?: "card" | "rpc";
  error?: string;
};

function looksCard(data: unknown): data is {
  name?: string;
  description?: string;
  skills?: unknown;
  capabilities?: unknown;
  url?: string;
} {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Boolean(
    d.name || d.skills || d.capabilities || d.url || d.endpoints || d.protocol,
  );
}

export async function probeA2aUrl(raw: string): Promise<A2aProbe> {
  const url = raw.trim();
  const blocked = ssrfBlocked(url);
  if (blocked) return { ok: false, error: blocked };
  if (!isPublicHireableUrl(url)) {
    return { ok: false, error: "Not a public hireable A2A URL" };
  }
  const candidates = [
    url,
    url.replace(/\/$/, "") + "/.well-known/agent-card.json",
  ];
  let last = "unreachable";
  for (const probed of candidates) {
    if (ssrfBlocked(probed)) continue;
    try {
      const res = await fetch(probed, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
        redirect: "manual",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && looksCard(json)) {
        return {
          ok: true,
          probed,
          name: String(json.name || json.url || ""),
          description: String(json.description || "").slice(0, 280),
          kind: "card",
        };
      }
      last = res.ok ? "JSON but not an agent card" : `${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : "fetch failed";
    }
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "0.2.9",
          clientInfo: { name: "genesis-probe", version: "1.0" },
          capabilities: {},
        },
      }),
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
    });
    const json = (await res.json().catch(() => null)) as {
      result?: unknown;
      jsonrpc?: string;
    } | null;
    if (json && (json.result || json.jsonrpc === "2.0")) {
      return { ok: true, probed: url, kind: "rpc" };
    }
  } catch (e) {
    last = e instanceof Error ? e.message : last;
  }
  return { ok: false, error: last };
}
