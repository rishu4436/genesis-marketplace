import type { Agent, ApiResponse, Feedback, PlatformStats } from "./types";

const BASE =
  process.env.SCAN_API_BASE?.replace(/\/$/, "") ||
  "https://8004scan.io/api/v1/public";

/** BNB Smart Chain mainnet */
export const BSC_CHAIN_ID = 56;

function headers(): HeadersInit {
  const h: HeadersInit = {
    Accept: "application/json",
  };
  const key = process.env.SCAN_API_KEY;
  if (key) h["X-API-Key"] = key;
  return h;
}

async function getJson<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `8004scan ${res.status}: ${text || res.statusText} (${path})`,
    );
  }

  return res.json() as Promise<ApiResponse<T>>;
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

export async function listAgents(params: ListAgentsParams = {}) {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 20));
  q.set("chainId", String(params.chainId ?? BSC_CHAIN_ID));
  if (params.search) q.set("search", params.search);
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  if (params.isTestnet !== undefined)
    q.set("isTestnet", String(params.isTestnet));

  return getJson<Agent[]>(`/agents?${q.toString()}`);
}

export async function getAgent(chainId: number, tokenId: string | number) {
  return getJson<Agent>(`/agents/${chainId}/${tokenId}`);
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

export async function getStats() {
  return getJson<PlatformStats>("/stats");
}

/** Dedupe agents by agent_id / chain+token */
export function dedupeAgents(agents: Agent[]): Agent[] {
  const seen = new Set<string>();
  const out: Agent[] = [];
  for (const a of agents) {
    const key =
      a.agent_id || `${a.chain_id}:${a.token_id}` || a.id || a.name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

export function agentHref(agent: Agent) {
  return `/agents/${agent.chain_id}/${agent.token_id}`;
}

export function explorerAgentUrl(agent: Agent) {
  return `https://8004scan.io/agents/bsc/${agent.token_id}`;
}

export function shortAddress(addr?: string | null, chars = 4) {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}
