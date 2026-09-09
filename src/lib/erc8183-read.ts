/**
 * Server-side ERC-8183 reads. Default chain 56 (mainnet). Pass 97 for testnet.
 */

import { createPublicClient, http, decodeEventLog } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import {
  bscRpcUrl,
  COMMERCE_ABI,
  ERC20_ABI,
  erc8183Stack,
  JOB_CREATED_EVENT,
  POLICY_ABI,
  statusName,
  type JobStatusName,
} from "./erc8183-escrow";

export function bscPublicClient(chainId: number = 56) {
  return createPublicClient({
    chain: chainId === 97 ? bscTestnet : bsc,
    transport: http(bscRpcUrl(chainId)),
  });
}

export type OnchainEscrowJob = {
  id: string;
  client: `0x${string}`;
  provider: `0x${string}`;
  description: string;
  budget: string;
  expiredAt: number;
  status: number;
  statusName: JobStatusName | "UNKNOWN";
  submittedAt: number;
  deliverable: `0x${string}`;
};

export async function readDisputeWindow(chainId: number = 56): Promise<number> {
  const a = erc8183Stack(chainId);
  const client = bscPublicClient(chainId);
  const w = await client.readContract({
    address: a.policy,
    abi: POLICY_ABI,
    functionName: "disputeWindow",
  });
  return Number(w);
}

export async function readJobCounter(chainId: number = 56): Promise<bigint> {
  const a = erc8183Stack(chainId);
  const client = bscPublicClient(chainId);
  return client.readContract({
    address: a.commerce,
    abi: COMMERCE_ABI,
    functionName: "jobCounter",
  });
}

export async function readOnchainJob(
  jobId: bigint,
  chainId: number = 56,
): Promise<OnchainEscrowJob> {
  const a = erc8183Stack(chainId);
  const client = bscPublicClient(chainId);
  const job = await client.readContract({
    address: a.commerce,
    abi: COMMERCE_ABI,
    functionName: "getJob",
    args: [jobId],
  });
  return {
    id: job.id.toString(),
    client: job.client,
    provider: job.provider,
    description: job.description,
    budget: job.budget.toString(),
    expiredAt: Number(job.expiredAt),
    status: Number(job.status),
    statusName: statusName(Number(job.status)),
    submittedAt: Number(job.submittedAt),
    deliverable: job.deliverable,
  };
}

export async function readTokenSnapshot(
  owner?: `0x${string}`,
  chainId: number = 56,
): Promise<{
  symbol: string;
  decimals: number;
  balanceWei?: string;
  allowanceWei?: string;
}> {
  const a = erc8183Stack(chainId);
  const client = bscPublicClient(chainId);
  const [symbol, decimals, balance, allowance] = await Promise.all([
    client.readContract({
      address: a.paymentToken,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    client.readContract({
      address: a.paymentToken,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
    owner
      ? client.readContract({
          address: a.paymentToken,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [owner],
        })
      : Promise.resolve(undefined),
    owner
      ? client.readContract({
          address: a.paymentToken,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [owner, a.commerce],
        })
      : Promise.resolve(undefined),
  ]);
  return {
    symbol: symbol || "U",
    decimals: Number(decimals),
    balanceWei: balance != null ? balance.toString() : undefined,
    allowanceWei: allowance != null ? allowance.toString() : undefined,
  };
}

export async function readNativeBalance(
  owner: `0x${string}`,
  chainId: number = 56,
): Promise<bigint> {
  const client = bscPublicClient(chainId);
  return client.getBalance({ address: owner });
}

export function parseJobIdFromCreateLogs(
  logs: { address?: string; topics?: readonly string[]; data?: string }[],
  chainId: number = 56,
): string | null {
  const commerce = erc8183Stack(chainId).commerce;
  for (const log of logs) {
    if (
      log.address &&
      log.address.toLowerCase() !== commerce.toLowerCase()
    ) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: [JOB_CREATED_EVENT],
        data: (log.data || "0x") as `0x${string}`,
        topics: (log.topics || []) as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName === "JobCreated") {
        const args = decoded.args as { jobId?: bigint };
        if (args.jobId != null) return args.jobId.toString();
      }
    } catch {
      /* next log */
    }
  }
  return null;
}

export function hasOnchainDeliverable(deliverable: string | undefined): boolean {
  if (!deliverable) return false;
  const hex = deliverable.replace(/^0x/i, "");
  return hex.length > 0 && /[1-9a-f]/i.test(hex);
}
