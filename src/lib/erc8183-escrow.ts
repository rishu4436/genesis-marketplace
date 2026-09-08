/**
 * BSC mainnet ERC-8183 stack used by in-app escrow checkout.
 * Addresses match @altananetwork/sdk ERC8183_ADDRESSES[56], apex-contracts,
 * and bnbagent BNB_CHAIN_ADDRESSES — not a new deployment.
 */

import { encodeFunctionData, parseEther, formatUnits } from "viem";
import { getPin } from "./pins";
import { getFeaturedByToken } from "./third-party-sellers";
import { GENESIS_AGENTS, getGenesisAgent } from "./genesis-agents";

export const ERC8183_CHAIN_ID = 56;
export const ERC8183_CHAIN_HEX = "0x38";

export const ERC8183_MAINNET = {
  chainId: ERC8183_CHAIN_ID,
  commerce: "0xEa4DAa3100A767e86FDed867729ae7446476EBA6" as `0x${string}`,
  router: "0x51895229E12F9876011789B04f8698af06cCD6DA" as `0x${string}`,
  policy: "0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5" as `0x${string}`,
  registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
  paymentToken: "0xcE24439F2D9C6a2289F741120FE202248B666666" as `0x${string}`,
} as const;

export const JOB_STATUS = [
  "OPEN",
  "FUNDED",
  "SUBMITTED",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
] as const;

export type JobStatusName = (typeof JOB_STATUS)[number];

export const COMMERCE_ABI = [
  {
    name: "createJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "setBudget",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "fund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "expectedBudget", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "claimRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getJob",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "provider", type: "address" },
          { name: "evaluator", type: "address" },
          { name: "description", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "expiredAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "hook", type: "address" },
          { name: "submittedAt", type: "uint256" },
          { name: "deliverable", type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "jobCounter",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "paymentToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const JOB_CREATED_EVENT = {
  type: "event",
  name: "JobCreated",
  inputs: [
    { name: "jobId", type: "uint256", indexed: true },
    { name: "client", type: "address", indexed: true },
    { name: "provider", type: "address", indexed: true },
    { name: "evaluator", type: "address", indexed: false },
    { name: "expiredAt", type: "uint256", indexed: false },
    { name: "hook", type: "address", indexed: false },
  ],
} as const;

export const ROUTER_ABI = [
  {
    name: "registerJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "policy", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "settle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "evidence", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const POLICY_ABI = [
  {
    name: "dispute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "disputeWindow",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

/** List prices from studio.toml [payments.erc8183].price (18 decimals). */
const GENESIS_BUDGET_U: Record<string, string> = {
  "range-keeper": "0.08",
  gridwright: "0.10",
  "yield-router": "0.07",
  "health-sentinel": "0.08",
};

export const DEFAULT_BUDGET_U = "0.08";
export const DEADLINE_SECONDS = 1800;
/** Typical 4–5 self-paid txs on BSC. */
export const ESTIMATED_GAS_BNB = "0.004";
export const MIN_BNB_BNB = "0.007";

export type EncodedCall = { to: `0x${string}`; data: `0x${string}` };

export type EscrowProvider = {
  address: `0x${string}`;
  label: string;
  genesisSlug?: string;
  role: "escrow-counterparty";
};

export function isHexAddress(value: string | undefined | null): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

export function isTxHash(value: string | undefined | null): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{64}$/.test(value));
}

export function resolveEscrowProvider(opts: {
  genesisSlug?: string;
  chainId?: number;
  tokenId?: string;
  ownerAddress?: string;
}): EscrowProvider | null {
  if (opts.genesisSlug) {
    const pin = getPin(opts.genesisSlug);
    const g = getGenesisAgent(opts.genesisSlug);
    if (isHexAddress(pin.walletAddress)) {
      return {
        address: pin.walletAddress,
        label: g?.name || opts.genesisSlug,
        genesisSlug: opts.genesisSlug,
        role: "escrow-counterparty",
      };
    }
  }
  if (opts.tokenId) {
    for (const g of GENESIS_AGENTS) {
      const pin = getPin(g.slug);
      if (
        String(pin.tokenId) === String(opts.tokenId) &&
        isHexAddress(pin.walletAddress)
      ) {
        return {
          address: pin.walletAddress,
          label: g.name,
          genesisSlug: g.slug,
          role: "escrow-counterparty",
        };
      }
    }
  }
  if (opts.chainId && opts.tokenId) {
    const featured = getFeaturedByToken(opts.chainId, opts.tokenId);
    if (featured && isHexAddress(featured.ownerAddress)) {
      return {
        address: featured.ownerAddress,
        label: featured.name,
        role: "escrow-counterparty",
      };
    }
  }
  if (isHexAddress(opts.ownerAddress)) {
    return {
      address: opts.ownerAddress,
      label: opts.genesisSlug || `Agent #${opts.tokenId || ""}`,
      genesisSlug: opts.genesisSlug,
      role: "escrow-counterparty",
    };
  }
  return null;
}

export function budgetUFor(opts: { genesisSlug?: string }): string {
  if (opts.genesisSlug && GENESIS_BUDGET_U[opts.genesisSlug]) {
    return GENESIS_BUDGET_U[opts.genesisSlug];
  }
  return DEFAULT_BUDGET_U;
}

export function budgetWeiFor(opts: { genesisSlug?: string; budgetU?: string }): bigint {
  const u = opts.budgetU || budgetUFor(opts);
  return parseEther(u);
}

export function formatU(wei: bigint, decimals = 18): string {
  return formatUnits(wei, decimals);
}

export function encodeApprove(amount: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.paymentToken,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ERC8183_MAINNET.commerce, amount],
    }),
  };
}

export function encodeCreateJob(opts: {
  provider: `0x${string}`;
  expiredAt: bigint;
  description: string;
}): EncodedCall {
  return {
    to: ERC8183_MAINNET.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "createJob",
      args: [
        opts.provider,
        ERC8183_MAINNET.router,
        opts.expiredAt,
        opts.description,
        ERC8183_MAINNET.router,
      ],
    }),
  };
}

export function encodeRegisterJob(jobId: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.router,
    data: encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: "registerJob",
      args: [jobId, ERC8183_MAINNET.policy],
    }),
  };
}

export function encodeSetBudget(jobId: bigint, amount: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "setBudget",
      args: [jobId, amount, "0x"],
    }),
  };
}

export function encodeFund(jobId: bigint, amount: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "fund",
      args: [jobId, amount, "0x"],
    }),
  };
}

export function encodeSettleApprove(jobId: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.router,
    data: encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: "settle",
      args: [jobId, "0x"],
    }),
  };
}

export function encodeDispute(jobId: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.policy,
    data: encodeFunctionData({
      abi: POLICY_ABI,
      functionName: "dispute",
      args: [jobId],
    }),
  };
}

export function encodeClaimRefund(jobId: bigint): EncodedCall {
  return {
    to: ERC8183_MAINNET.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "claimRefund",
      args: [jobId],
    }),
  };
}

export function statusName(status: number): JobStatusName | "UNKNOWN" {
  return JOB_STATUS[status] ?? "UNKNOWN";
}

export function bscscanTx(hash: string): string {
  return `https://bscscan.com/tx/${hash}`;
}

export function bscscanAddress(addr: string): string {
  return `https://bscscan.com/address/${addr}`;
}

export function bscRpcUrl(): string {
  return (
    process.env.BSC_RPC_URL?.trim() ||
    process.env.RPC_URL_BSC_MAINNET?.trim() ||
    "https://bsc-dataseed.binance.org"
  );
}

export type EscrowUiPhase =
  | "quoted"
  | "funded"
  | "working"
  | "delivered"
  | "dispute-window"
  | "settled"
  | "disputed"
  | "expired";

export function escrowUiPhase(opts: {
  chainStatus?: string;
  hasPayload: boolean;
  submittedAt?: number;
  disputeWindowSeconds?: number;
  nowSec?: number;
}): EscrowUiPhase {
  const st = (opts.chainStatus || "").toUpperCase();
  if (st === "COMPLETED") return "settled";
  if (st === "REJECTED") return "disputed";
  if (st === "EXPIRED") return "expired";
  if (st === "OPEN") return "quoted";
  if (st === "SUBMITTED") {
    if (!opts.hasPayload) return "working";
    const submitted = opts.submittedAt || 0;
    const window = opts.disputeWindowSeconds || 24 * 60 * 60;
    const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
    if (submitted > 0 && now < submitted + window) return "dispute-window";
    return "delivered";
  }
  if (st === "FUNDED") {
    return "funded";
  }
  return "quoted";
}
