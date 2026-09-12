import { NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { currentAccount } from "@/lib/session";
import { takeNonce } from "@/lib/accounts";
import { listAgentMessage } from "@/lib/auth-messages";
import { readIdentityOwner, sameWallet } from "@/lib/erc8004-owner";
import {
  createListingDraft,
  saveListing,
} from "@/lib/seller-listings";
import { rateGate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: Request) {
  const limited = await rateGate(req, "sell-claim", 8, 15 * 60);
  if (limited) return limited;
  try {
    const acc = await currentAccount();
    if (!acc?.wallet) {
      return NextResponse.json(
        {
          success: false,
          error: "Sign in with the wallet that owns the ERC-8004 token.",
        },
        { status: 401 },
      );
    }
    const body = (await req.json()) as {
      tokenId?: string;
      chainId?: number;
      signature?: string;
      nonce?: string;
    };
    const tokenId = String(body.tokenId || "").trim();
    if (!/^\d+$/.test(tokenId)) {
      return NextResponse.json(
        { success: false, error: "ERC-8004 token id required" },
        { status: 400 },
      );
    }
    const chainId = Number(body.chainId || 56);
    if (chainId !== 56) {
      return NextResponse.json(
        { success: false, error: "BSC mainnet (56) only" },
        { status: 400 },
      );
    }
    let owner: `0x${string}`;
    try {
      owner = await readIdentityOwner(tokenId, chainId);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Token #${tokenId} is not on the BSC identity registry.`,
        },
        { status: 400 },
      );
    }
    if (!sameWallet(owner, acc.wallet)) {
      return NextResponse.json(
        {
          success: false,
          error: `Wallet ${acc.wallet.slice(0, 8)}… does not own #${tokenId}. Owner is ${owner.slice(0, 8)}…`,
        },
        { status: 403 },
      );
    }
    if (!body.signature || !body.nonce) {
      return NextResponse.json(
        { success: false, error: "Sign the list-agent message from this wallet." },
        { status: 400 },
      );
    }
    if (!(await takeNonce(body.nonce))) {
      return NextResponse.json(
        { success: false, error: "Signature expired. Try again." },
        { status: 400 },
      );
    }
    const recovered = await recoverMessageAddress({
      message: listAgentMessage(body.nonce, tokenId),
      signature: body.signature as `0x${string}`,
    });
    if (!sameWallet(recovered, owner)) {
      return NextResponse.json(
        { success: false, error: "Signature is not from the token owner." },
        { status: 403 },
      );
    }
    const draft = createListingDraft({
      chainId,
      tokenId,
      ownerAddress: owner,
      accountId: acc.id,
    });
    const saved = await saveListing({ ...draft, gate: "indexed" });
    return NextResponse.json({
      success: true,
      data: saved,
      note: "Indexed. Not hireable until a live A2A job ticket passes probe.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Claim failed",
      },
      { status: 500 },
    );
  }
}
