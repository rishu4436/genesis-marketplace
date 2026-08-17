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
};

export type Feedback = {
  id: string;
  chain_id: number;
  token_id: number | string;
  user_id?: string;
  score: number;
  comment?: string;
  created_at?: string;
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
