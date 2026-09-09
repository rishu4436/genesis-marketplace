/**
 * ERC-8183 stacks used by in-app escrow checkout.
 * Mainnet (56) matches @altananetwork/sdk ERC8183_ADDRESSES[56], apex-contracts,
 * and bnbagent BNB_CHAIN_ADDRESSES. Testnet (97) uses the live kernel — not
 * the stale SDK 0.7.1 policy (that address is not whitelisted).
 */

import { encodeFunctionData, parseEther, formatUnits, stringToHex } from "viem";
import { getPin } from "./pins";
import { getFeaturedByToken } from "./third-party-sellers";
import { GENESIS_AGENTS, getGenesisAgent } from "./genesis-agents";
import { parseDocumentedListU } from "./listing-price";

export const ERC8183_CHAIN_ID = 56;
export const ERC8183_CHAIN_HEX = "0x38";
export const ERC8183_TESTNET_CHAIN_ID = 97;
export const ERC8183_TESTNET_CHAIN_HEX = "0x61";

export type Erc8183Addresses = {
  chainId: 56 | 97;
  commerce: `0x${string}`;
  router: `0x${string}`;
  policy: `0x${string}`;
  registry: `0x${string}`;
  paymentToken: `0x${string}`;
};

export const ERC8183_MAINNET: Erc8183Addresses = {
  chainId: 56,
  commerce: "0xEa4DAa3100A767e86FDed867729ae7446476EBA6",
  router: "0x51895229E12F9876011789B04f8698af06cCD6DA",
  policy: "0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5",
  registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  paymentToken: "0xcE24439F2D9C6a2289F741120FE202248B666666",
};

/**
 * BSC testnet kernel. SDK 0.7.1 still lists policy 0x4F46…78A6 — that
 * address is NOT whitelisted (PolicyNotWhitelisted). Live OptimisticPolicy
 * on the testnet router is 0xd6a4…1cEA with a 900s dispute window.
 */
export const ERC8183_TESTNET: Erc8183Addresses = {
  chainId: 97,
  commerce: "0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE",
  router: "0xD7d36D66d2F1B608A0F943f722D27e3744f66F25",
  policy: "0xd6a4217588F6B1F5657a92A3e94E6422aD771cEA",
  registry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  paymentToken: "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565",
};

export function isEscrowChainId(n: number): n is 56 | 97 {
  return n === 56 || n === 97;
}

export function erc8183Stack(chainId: number = 56): Erc8183Addresses {
  return chainId === 97 ? ERC8183_TESTNET : ERC8183_MAINNET;
}

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
    name: "submit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverable", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
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
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/**
 * Genesis SKU $ → kernel $U. $8 list locks 0.08 $U (RangeKeeper 56754).
 * HealthSentinel SKU $6 must lock 0.06 $U, not the old flat 0.08.
 */
export function skuUsdToLockU(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "";
  return (usd / 100).toFixed(2);
}

export function formatLockU(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return amount.toFixed(2);
}

export type LockUOpts = {
  genesisSlug?: string;
  chainId?: number;
  tokenId?: string;
};

/** Published lock only. Null = seller has not named a $U amount. */
export function listedLockU(opts: LockUOpts): string | null {
  if (opts.genesisSlug) {
    const g = getGenesisAgent(opts.genesisSlug);
    if (g && g.basePriceUsd > 0) {
      const u = skuUsdToLockU(g.basePriceUsd);
      if (u) return u;
    }
  }
  if (opts.chainId != null && opts.tokenId) {
    const pin = getFeaturedByToken(opts.chainId, opts.tokenId);
    if (typeof pin?.listPriceU === "number" && pin.listPriceU > 0) {
      return formatLockU(pin.listPriceU);
    }
    const documented = parseDocumentedListU(
      pin?.tagline,
      pin?.description,
    );
    if (documented != null) return formatLockU(documented);
  }
  return null;
}

/** Fallback only for callers that still need a string. Prefer listedLockU. */
export const DEFAULT_BUDGET_U = "0.08";
/**
 * Extra seconds after the dispute window on create/fund.
 * OptimisticPolicy reverts submit with SubmissionTooLate if
 * `now + disputeWindow > expiredAt`. So this is the seller's
 * time-to-submit after fund — 30 minutes was too short.
 */
export const DEADLINE_SECONDS = 7 * 24 * 60 * 60;
/** Extra seconds after the dispute window on testnet (window is 900s). */
export const TESTNET_DEADLINE_SECONDS = 2 * 60 * 60;

export function deadlineSecondsFor(chainId: number): number {
  return chainId === 97 ? TESTNET_DEADLINE_SECONDS : DEADLINE_SECONDS;
}
/** Typical 4–5 self-paid txs on BSC. */
export const ESTIMATED_GAS_BNB = "0.004";
export const MIN_BNB_BNB = "0.007";
/** Testnet gas is cheap; keep a small tBNB floor so fund/settle can sign. */
export const ESTIMATED_GAS_BNB_TESTNET = "0.001";
export const MIN_BNB_TESTNET = "0.002";

export function minBnbFor(chainId: number): string {
  return chainId === 97 ? MIN_BNB_TESTNET : MIN_BNB_BNB;
}

export function estimatedGasFor(chainId: number): string {
  return chainId === 97 ? ESTIMATED_GAS_BNB_TESTNET : ESTIMATED_GAS_BNB;
}

export function nativeSymbolFor(chainId: number): string {
  return chainId === 97 ? "tBNB" : "BNB";
}

export function escrowNetworkLabel(chainId: number): string {
  return chainId === 97 ? "BSC testnet (historical)" : "On-chain · BSC 56";
}

/** True when the policy will accept submit() on a FUNDED job. */
export function canSubmitOnchain(opts: {
  statusName?: string;
  expiredAt?: number;
  disputeWindowSeconds?: number;
  nowSec?: number;
}): boolean {
  if ((opts.statusName || "").toUpperCase() !== "FUNDED") return false;
  const expiredAt = opts.expiredAt || 0;
  const window = opts.disputeWindowSeconds || 7 * 24 * 60 * 60;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (expiredAt <= 0) return false;
  return now + window <= expiredAt;
}

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

export function budgetUFor(opts: LockUOpts = {}): string {
  return listedLockU(opts) || DEFAULT_BUDGET_U;
}

export function budgetWeiFor(opts: LockUOpts & { budgetU?: string }): bigint {
  const u = opts.budgetU || budgetUFor(opts);
  return parseEther(u);
}

export function formatU(wei: bigint, decimals = 18): string {
  return formatUnits(wei, decimals);
}

export function encodeApprove(amount: bigint, chainId: number = 56): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.paymentToken,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [a.commerce, amount],
    }),
  };
}

export function encodeCreateJob(opts: {
  provider: `0x${string}`;
  expiredAt: bigint;
  description: string;
  chainId?: number;
}): EncodedCall {
  const a = erc8183Stack(opts.chainId ?? 56);
  return {
    to: a.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "createJob",
      args: [opts.provider, a.router, opts.expiredAt, opts.description, a.router],
    }),
  };
}

export function encodeRegisterJob(jobId: bigint, chainId: number = 56): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.router,
    data: encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: "registerJob",
      args: [jobId, a.policy],
    }),
  };
}

export function encodeSetBudget(
  jobId: bigint,
  amount: bigint,
  chainId: number = 56,
): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "setBudget",
      args: [jobId, amount, "0x"],
    }),
  };
}

export function encodeFund(
  jobId: bigint,
  amount: bigint,
  chainId: number = 56,
): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "fund",
      args: [jobId, amount, "0x"],
    }),
  };
}

/** sha256 hex from a sealed receipt → bytes32 the kernel stores. */
export function bytes32FromSha256(hex: string | null | undefined): `0x${string}` | null {
  const h = (hex || "").replace(/^0x/i, "");
  if (!/^[a-fA-F0-9]{64}$/.test(h)) return null;
  return `0x${h}`;
}

/**
 * Provider-only: Funded → Submitted. `deliverable` is the plan hash
 * (receipt outputHash). optParams may carry a public receipt URL for
 * the policy's JobInitialised log — never a payout address.
 */
export function encodeSubmit(opts: {
  jobId: bigint;
  deliverable: `0x${string}`;
  receiptUrl?: string;
  chainId?: number;
}): EncodedCall {
  const a = erc8183Stack(opts.chainId ?? 56);
  const optParams = opts.receiptUrl
    ? stringToHex(JSON.stringify({ deliverable_url: opts.receiptUrl }))
    : "0x";
  return {
    to: a.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "submit",
      args: [opts.jobId, opts.deliverable, optParams],
    }),
  };
}

export function encodeSettleApprove(jobId: bigint, chainId: number = 56): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.router,
    data: encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: "settle",
      args: [jobId, "0x"],
    }),
  };
}

export function encodeDispute(jobId: bigint, chainId: number = 56): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.policy,
    data: encodeFunctionData({
      abi: POLICY_ABI,
      functionName: "dispute",
      args: [jobId],
    }),
  };
}

export function encodeClaimRefund(jobId: bigint, chainId: number = 56): EncodedCall {
  const a = erc8183Stack(chainId);
  return {
    to: a.commerce,
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

export function bscscanTx(hash: string, chainId: number = 56): string {
  const host = chainId === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com";
  return `${host}/tx/${hash}`;
}

export function bscscanAddress(addr: string, chainId: number = 56): string {
  const host = chainId === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com";
  return `${host}/address/${addr}`;
}

export function bscRpcUrl(chainId: number = 56): string {
  if (chainId === 97) {
    return (
      process.env.BSC_TESTNET_RPC_URL?.trim() ||
      "https://bsc-testnet-rpc.publicnode.com"
    );
  }
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
