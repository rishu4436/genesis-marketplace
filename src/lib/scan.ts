import type { Agent, ApiResponse, Feedback, PlatformStats } from "./types";
import { kvCmd } from "./kv";
import { loadHireableBsc } from "./hireable-bsc";

const BASE =
  process.env.SCAN_API_BASE?.replace(/\/$/, "") ||
  "https://api.8004scan.io/api/v1";

/** BNB Smart Chain mainnet */
export const BSC_CHAIN_ID = 56;

/** Partner API timeout — official A2A list often needs ~12s */
const FETCH_MS = 12_000;
/** Stats probe is on the judge path — fail faster, reuse last-good. */
const STATS_MS = 2_000;
const STATS_STALE_MS = 30 * 60 * 1000;

let lastGoodStats: { at: number; data: PlatformStats } | null = null;
const STATS_KV = "genesis:8004scan:stats:v1";

function headers(): HeadersInit {
  const h: HeadersInit = {
    Accept: "application/json",
  };
  const key = process.env.SCAN_API_KEY;
  if (key) h["X-API-Key"] = key;
  return h;
}

function abortSignal(ms: number): AbortSignal {
  // Node 18+ / modern browsers
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function getJson<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<ApiResponse<T>> {
  const timeoutMs = init?.timeoutMs ?? FETCH_MS;
  const rest = { ...init };
  delete rest.timeoutMs;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { ...headers(), ...init?.headers },
    signal: init?.signal ?? abortSignal(timeoutMs),
    // Cache partner data briefly so pages don't re-hammer the API every click
    next: { revalidate: 180 },
  });

  const raw = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const errBody = raw as { error?: { message?: string } | string } | null;
    const msg =
      (typeof errBody?.error === "object"
        ? errBody.error?.message
        : errBody?.error) ||
      res.statusText ||
      "request failed";
    throw new Error(`8004scan ${res.status}: ${msg} (${path})`);
  }

  const body = normalizeScanBody<T>(raw);
  if (!body) {
    throw new Error(`8004scan: empty response (${path})`);
  }

  if (body.success === false) {
    throw new Error(
      `8004scan: ${body.error?.message || "backend error"} (${path})`,
    );
  }

  return body;
}

/** Official API returns `{ items, total }`; public proxy returns `{ success, data }`. */
function normalizeScanBody<T>(raw: unknown): ApiResponse<T> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.items)) {
    const limit = Number(o.limit ?? 20) || 20;
    const offset = Number(o.offset ?? 0) || 0;
    const total = Number(o.total ?? o.items.length) || o.items.length;
    return {
      success: true,
      data: o.items as T,
      meta: {
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          hasMore: offset + limit < total,
        },
      },
    };
  }

  if ("data" in o || "success" in o) {
    return o as ApiResponse<T>;
  }

  if (o.token_id != null && o.name != null) {
    return { success: true, data: raw as T };
  }

  return o as ApiResponse<T>;
}

/** Safe wrapper — returns null data instead of throwing */
export async function safeGetJson<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<{ data: T | null; error: string | null; meta?: ApiResponse<T>["meta"] }> {
  try {
    const res = await getJson<T>(path, init);
    return { data: res.data ?? null, error: null, meta: res.meta };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    // Treat abort/timeout as soft error
    return {
      data: null,
      error: msg.includes("abort") || msg.includes("Timeout")
        ? "Partner data centre timed out — try again"
        : msg,
    };
  }
}

export type ListAgentsParams = {
  page?: number;
  limit?: number;
  chainId?: number;
  search?: string;
  protocol?: "MCP" | "A2A" | "OASF" | "Web" | "Email";
  sortBy?: "created_at" | "stars" | "name" | "token_id" | "total_score";
  sortOrder?: "asc" | "desc";
  isTestnet?: boolean;
};

function listQuery(params: ListAgentsParams = {}) {
  const q = new URLSearchParams();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const chainId = params.chainId ?? BSC_CHAIN_ID;
  q.set("page", String(page));
  q.set("limit", String(limit));
  q.set("offset", String((page - 1) * limit));
  q.set("chainId", String(chainId));
  q.set("chain_id", String(chainId));
  if (params.search) q.set("search", params.search);
  if (params.protocol) {
    q.set("protocol", params.protocol);
    q.set("supported_protocol", params.protocol);
  }
  if (params.sortBy) {
    q.set("sortBy", params.sortBy);
    q.set("sort_by", params.sortBy);
  }
  if (params.sortOrder) {
    q.set("sortOrder", params.sortOrder);
    q.set("sort_order", params.sortOrder);
  }
  if (params.isTestnet !== undefined) {
    q.set("isTestnet", String(params.isTestnet));
    q.set("is_testnet", String(params.isTestnet));
  }
  return q.toString();
}

export async function listAgents(params: ListAgentsParams = {}) {
  return getJson<Agent[]>(`/agents?${listQuery(params)}`);
}

export async function listAgentsSafe(params: ListAgentsParams = {}) {
  return safeGetJson<Agent[]>(`/agents?${listQuery(params)}`);
}

export async function getAgent(chainId: number, tokenId: string | number) {
  return getJson<Agent>(`/agents/${chainId}/${tokenId}`);
}

export async function getAgentSafe(chainId: number, tokenId: string | number) {
  return safeGetJson<Agent>(`/agents/${chainId}/${tokenId}`);
}

export async function searchAgents(opts: {
  q: string;
  limit?: number;
  chainId?: number;
  semanticWeight?: number;
}) {
  return getJson<Agent[]>(
    `/agents?${listQuery({
      search: opts.q,
      limit: opts.limit ?? 20,
      chainId: opts.chainId ?? BSC_CHAIN_ID,
      protocol: "A2A",
      sortBy: "total_score",
      sortOrder: "desc",
    })}`,
  );
}

export async function searchAgentsSafe(opts: {
  q: string;
  limit?: number;
  chainId?: number;
  semanticWeight?: number;
}) {
  return safeGetJson<Agent[]>(
    `/agents?${listQuery({
      search: opts.q,
      limit: opts.limit ?? 20,
      chainId: opts.chainId ?? BSC_CHAIN_ID,
      protocol: "A2A",
      sortBy: "total_score",
      sortOrder: "desc",
    })}`,
  );
}

export async function listFeedbacks(opts: {
  chainId?: number;
  tokenId?: string | number;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  q.set("page", String(opts.page ?? 1));
  q.set("limit", String(opts.limit ?? 20));
  if (opts.chainId !== undefined) q.set("chainId", String(opts.chainId));
  if (opts.tokenId !== undefined) q.set("tokenId", String(opts.tokenId));

  return getJson<Feedback[]>(`/feedbacks?${q.toString()}`);
}

export async function listFeedbacksSafe(opts: {
  chainId?: number;
  tokenId?: string | number;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  q.set("page", String(opts.page ?? 1));
  q.set("limit", String(opts.limit ?? 20));
  if (opts.chainId !== undefined) q.set("chainId", String(opts.chainId));
  if (opts.tokenId !== undefined) q.set("tokenId", String(opts.tokenId));

  return safeGetJson<Feedback[]>(`/feedbacks?${q.toString()}`);
}

export async function getStats() {
  try {
    return await getJson<PlatformStats>("/stats");
  } catch {
    return getJson<PlatformStats>("/stats/global");
  }
}

export async function getStatsSafe(): Promise<{
  data: PlatformStats | null;
  error: string | null;
  meta?: ApiResponse<PlatformStats>["meta"];
  stale?: boolean;
}> {
  const fresh = await safeGetJson<PlatformStats>("/stats", {
    timeoutMs: STATS_MS,
  });
  if (fresh.data) {
    lastGoodStats = { at: Date.now(), data: fresh.data };
    void kvCmd("SET", STATS_KV, JSON.stringify(lastGoodStats));
    return fresh;
  }
  const global = await safeGetJson<PlatformStats>("/stats/global", {
    timeoutMs: STATS_MS,
  });
  if (global.data) {
    lastGoodStats = { at: Date.now(), data: global.data };
    void kvCmd("SET", STATS_KV, JSON.stringify(lastGoodStats));
    return global;
  }
  if (lastGoodStats && Date.now() - lastGoodStats.at < STATS_STALE_MS) {
    return {
      data: lastGoodStats.data,
      error: null,
      stale: true,
    };
  }
  const cached = await kvCmd<string>("GET", STATS_KV);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as {
        at?: number;
        data?: PlatformStats;
      };
      if (parsed.data && (parsed.data.total_agents || 0) > 0) {
        lastGoodStats = {
          at: parsed.at || Date.now(),
          data: parsed.data,
        };
        return {
          data: parsed.data,
          error: null,
          stale: true,
        };
      }
    } catch {
      /* ignore */
    }
  }
  const file = loadHireableBsc();
  if (file.registered > 0) {
    return {
      data: { total_agents: file.registered },
      error: null,
      stale: true,
    };
  }
  return fresh;
}

/** Dedupe agents by agent_id / chain+token */
export function dedupeAgents(agents: Agent[]): Agent[] {
  const seen = new Set<string>();
  const out: Agent[] = [];
  for (const a of agents) {
    const key =
      a.chain_id != null && a.token_id != null
        ? `${a.chain_id}:${a.token_id}`
        : a.agent_id || a.id || a.name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

export function agentHref(agent: Agent) {
  return `/agents/${agent.chain_id}/${agent.token_id}`;
}

export function agentKey(agent: Agent) {
  return `${agent.chain_id}:${agent.token_id}`;
}

export function parseAgentKey(
  key: string,
): { chainId: number; tokenId: string } | null {
  const [c, t] = key.split(":");
  if (!c || !t) return null;
  const chainId = Number(c);
  if (!Number.isFinite(chainId)) return null;
  return { chainId, tokenId: t };
}

export function shortAddress(addr?: string | null, chars = 4) {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export function explorerAgentUrl(agent: Agent) {
  const id = String(agent.token_id || "");
  if (/^\d+$/.test(id)) {
    const chain =
      Number(agent.chain_id) === 56 || !agent.chain_id
        ? "bsc"
        : String(agent.chain_id);
    return `https://8004scan.io/agents/${chain}/${id}`;
  }
  return "https://8004scan.io/agents?chain=56";
}
