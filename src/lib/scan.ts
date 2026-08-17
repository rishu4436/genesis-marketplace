import type { Agent, ApiResponse, Feedback, PlatformStats } from "./types";

const BASE =
  process.env.SCAN_API_BASE?.replace(/\/$/, "") ||
  "https://8004scan.io/api/v1/public";

/** BNB Smart Chain mainnet */
export const BSC_CHAIN_ID = 56;

/** Partner API timeout — never hang the UI forever */
const FETCH_MS = 8_000;

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
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
    signal: init?.signal ?? abortSignal(FETCH_MS),
    // Cache partner data briefly so pages don't re-hammer the API every click
    next: { revalidate: 60 },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok) {
    const msg =
      body?.error?.message ||
      res.statusText ||
      "request failed";
    throw new Error(`8004scan ${res.status}: ${msg} (${path})`);
  }

  if (body && body.success === false) {
    throw new Error(
      `8004scan: ${body.error?.message || "backend error"} (${path})`,
    );
  }

  if (!body) {
    throw new Error(`8004scan: empty response (${path})`);
  }

  return body;
}

/** Safe wrapper — returns null data instead of throwing */
export async function safeGetJson<T>(
  path: string,
): Promise<{ data: T | null; error: string | null; meta?: ApiResponse<T>["meta"] }> {
  try {
    const res = await getJson<T>(path);
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
  sortBy?: "created_at" | "stars" | "name" | "token_id" | "total_score";
  sortOrder?: "asc" | "desc";
  isTestnet?: boolean;
};

function listQuery(params: ListAgentsParams = {}) {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 20));
  q.set("chainId", String(params.chainId ?? BSC_CHAIN_ID));
  if (params.search) q.set("search", params.search);
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  if (params.isTestnet !== undefined)
    q.set("isTestnet", String(params.isTestnet));
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
  const q = new URLSearchParams();
  q.set("q", opts.q);
  q.set("limit", String(opts.limit ?? 20));
  q.set("chainId", String(opts.chainId ?? BSC_CHAIN_ID));
  if (opts.semanticWeight !== undefined)
    q.set("semanticWeight", String(opts.semanticWeight));

  return getJson<Agent[]>(`/agents/search?${q.toString()}`);
}

export async function searchAgentsSafe(opts: {
  q: string;
  limit?: number;
  chainId?: number;
  semanticWeight?: number;
}) {
  const q = new URLSearchParams();
  q.set("q", opts.q);
  q.set("limit", String(opts.limit ?? 20));
  q.set("chainId", String(opts.chainId ?? BSC_CHAIN_ID));
  if (opts.semanticWeight !== undefined)
    q.set("semanticWeight", String(opts.semanticWeight));

  return safeGetJson<Agent[]>(`/agents/search?${q.toString()}`);
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
  return getJson<PlatformStats>("/stats");
}

export async function getStatsSafe() {
  return safeGetJson<PlatformStats>("/stats");
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
  return `https://8004scan.io/agents/bsc/${agent.token_id}`;
}
