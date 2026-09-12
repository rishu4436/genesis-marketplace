/**
 * ERC-8004 identity owner on BSC. ownerOf on the identity registry.
 */

import { getAddress } from "viem";
import { ERC8004_IDENTITY_REGISTRY } from "./proof-jobs";
import { bscPublicClient } from "./erc8183-read";

const ERC721_OWNER_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

export async function readIdentityOwner(
  tokenId: string,
  chainId: number = 56,
): Promise<`0x${string}`> {
  if (!/^\d+$/.test(String(tokenId))) throw new Error("Invalid token id");
  const id = BigInt(tokenId);
  const client = bscPublicClient(chainId);
  const owner = await client.readContract({
    address: ERC8004_IDENTITY_REGISTRY as `0x${string}`,
    abi: ERC721_OWNER_ABI,
    functionName: "ownerOf",
    args: [id],
  });
  return getAddress(owner);
}

export function sameWallet(a: string, b: string): boolean {
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
}
