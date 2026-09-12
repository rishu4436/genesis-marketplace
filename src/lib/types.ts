export type Agent = {
  id: string;
  agent_id: string;
  token_id: number | string;
  chain_id: number;
  chain_type?: string;
  contract_address?: string;
  is_testnet?: boolean;
  owner_address?: string;
  name: string;
  description: string;
  image_url?: string | null;
  is_verified?: boolean;
  star_count?: number;
  supported_protocols?: string[];
  x402_supported?: boolean;
  a2a_endpoint?: string | null;
  total_score?: number;
  rank?: number | null;
  network_rank?: number | null;
  health_score?: number | null;
  total_feedbacks?: number;
  average_score?: number;
  created_at?: string;
  updated_at?: string;
  /** Public endpoint probe (Census) — not a hire guarantee. */
  probe_status?: "alive" | "dead" | "degraded" | "never-probed";
  probe_latency_ms?: number;
  census_category?: string;
  /** On the desk because we pinned or a seller probe passed — not keyword+URL. */
  desk_live?: boolean;
  quote_only?: boolean;
  list_lock_u?: string;
  you_send?: string;
  you_get?: string;
  last_probe_at?: string;
};

export type Feedback = {
  id: string;
  chain_id: number;
  token_id?: number | string;
  user_id?: string;
  user_address?: string;
  score: number;
  comment?: string;
  created_at?: string;
  tag1?: string;
  tag2?: string;
  agent?: { token_id?: number | string; name?: string };
};

export type PlatformStats = {
  total_agents?: number;
  total_users?: number;
  total_feedbacks?: number;
  total_validations?: number;
};

export type ApiListMeta = {
  version?: string;
  timestamp?: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: ApiListMeta;
  error?: { code?: string; message?: string };
};
