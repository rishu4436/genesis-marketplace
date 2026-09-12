/**
 * Probe a public A2A URL. Reachable card/RPC ≠ hireable by itself.
 */

import { isPublicHireableUrl } from "./hire-class";

export function probeUrlBlocked(raw: string): string | null {
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
  canary?: boolean;
  error?: string;
};

function isPrivateIp(addr: string): boolean {
  const v4 = addr.replace(/^::ffff:/i, "");
  if (v4 === "::1" || addr.startsWith("fe80:") || addr.startsWith("fc") || addr.startsWith("fd")) {
    return true;
  }
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return false;
  const [a, b] = v4.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

async function assertPublicDns(url: string): Promise<string | null> {
  const host = new URL(url).hostname.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    return isPrivateIp(host) ? "private IP" : null;
  }
  try {
    const { lookup } = await import("node:dns/promises");
    const all = await lookup(host, { all: true });
    if (all.some((r) => isPrivateIp(r.address))) return "resolved private IP";
  } catch {
    return "dns lookup failed";
  }
  return null;
}

function jsonRpcFailed(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.error != null && d.result == null;
}

async function canaryNegotiate(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "canary",
        method: "message/send",
        params: {
          message: {
            role: "user",
            parts: [{ kind: "text", text: "canary quote" }],
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
      cache: "no-store",
    });
    const json = await readJsonCapped(res).catch(() => null);
    if (!res.ok || jsonRpcFailed(json)) return false;
    if (json && typeof json === "object" && "result" in json) return true;
    return false;
  } catch {
    return false;
  }
}

const MAX_PROBE_BYTES = 65_536;

async function readJsonCapped(res: Response): Promise<unknown> {
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_PROBE_BYTES) throw new Error("Response too large");
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_PROBE_BYTES) throw new Error("Response too large");
  const text = new TextDecoder().decode(buf);
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
}

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
  const blocked = probeUrlBlocked(url);
  if (blocked) return { ok: false, error: blocked };
  const dns = await assertPublicDns(url);
  if (dns) return { ok: false, error: dns };
  if (!isPublicHireableUrl(url)) {
    return { ok: false, error: "Not a public hireable A2A URL" };
  }
  const candidates = [
    url,
    url.replace(/\/$/, "") + "/.well-known/agent-card.json",
  ];
  let last = "unreachable";
  for (const probed of candidates) {
    if (probeUrlBlocked(probed)) continue;
    try {
      const res = await fetch(probed, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
        redirect: "manual",
      });
      const json = await readJsonCapped(res).catch(() => null);
      if (jsonRpcFailed(json)) {
        last = "JSON-RPC error envelope";
        continue;
      }
      if (res.ok && looksCard(json)) {
        const canary = await canaryNegotiate(url);
        return {
          ok: true,
          probed,
          name: String(json.name || json.url || ""),
          description: String(json.description || "").slice(0, 280),
          kind: "card",
          canary,
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
    const json = (await readJsonCapped(res).catch(() => null)) as {
      result?: unknown;
      jsonrpc?: string;
    } | null;
    if (jsonRpcFailed(json)) {
      last = "JSON-RPC error envelope";
    } else if (json && json.result) {
      const canary = await canaryNegotiate(url);
      return { ok: true, probed: url, kind: "rpc", canary };
    }
  } catch (e) {
    last = e instanceof Error ? e.message : last;
  }
  return { ok: false, error: last };
}
