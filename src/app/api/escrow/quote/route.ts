import { NextResponse } from "next/server";
import {
  budgetWeiFor,
  listedLockU,
  deadlineSecondsFor,
  encodeApprove,
  encodeCreateJob,
  erc8183Stack,
  estimatedGasFor,
  isHexAddress,
  minBnbFor,
  resolveEscrowProvider,
} from "@/lib/erc8183-escrow";
import {
  readDisputeWindow,
  readJobCounter,
  readNativeBalance,
  readTokenSnapshot,
} from "@/lib/erc8183-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/escrow/quote
 * Prepare an ERC-8183 hire: addresses, budget, predicted job id, create/approve calldata.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      genesisSlug?: string;
      chainId?: number;
      tokenId?: string;
      ownerAddress?: string;
      task?: string;
      wallet?: string;
      budgetU?: string;
      /** Desk escrow is BSC 56. Chain 97 is rejected. */
      escrowChainId?: number;
    };

    const task = (body.task || "").trim();
    if (task.length <= 8) {
      return NextResponse.json(
        { success: false, error: "Add a short job brief first" },
        { status: 400 },
      );
    }
    if (new TextEncoder().encode(task).length > 4096) {
      return NextResponse.json(
        { success: false, error: "Brief exceeds the 4096-byte kernel limit" },
        { status: 400 },
      );
    }

    const provider = resolveEscrowProvider({
      genesisSlug: body.genesisSlug,
      chainId: body.chainId,
      tokenId: body.tokenId,
      ownerAddress: body.ownerAddress,
    });
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This listing has no ERC-8183 provider identity. Soft hire still works.",
        },
        { status: 400 },
      );
    }

    let budgetU = listedLockU({
      genesisSlug: body.genesisSlug,
      chainId: body.chainId,
      tokenId: body.tokenId,
    });
    if (!budgetU && body.chainId && body.tokenId) {
      const { getListingByToken } = await import("@/lib/seller-listings");
      const listing = getListingByToken(body.chainId, body.tokenId);
      if (
        listing?.gate === "hireable" &&
        listing.lockU &&
        !listing.quoteOnly
      ) {
        budgetU = listing.lockU;
      }
    }
    if (!budgetU) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This seller has not published a $U lock. Get plan is free and does not need $U.",
        },
        { status: 400 },
      );
    }
    const budgetWei = budgetWeiFor({
      genesisSlug: body.genesisSlug,
      chainId: body.chainId,
      tokenId: body.tokenId,
      budgetU,
    });

    const wallet = isHexAddress(body.wallet) ? body.wallet : undefined;
    if (Number(body.escrowChainId) === 97) {
      return NextResponse.json(
        {
          success: false,
          error: "Escrow is BSC mainnet only (chain 56).",
        },
        { status: 400 },
      );
    }
    const escrowChainId = 56;
    const stack = erc8183Stack(escrowChainId);
    const extraDeadline = deadlineSecondsFor(escrowChainId);

    const [disputeWindow, jobCounter, token, bnbWei] = await Promise.all([
      readDisputeWindow(escrowChainId),
      readJobCounter(escrowChainId),
      readTokenSnapshot(wallet, escrowChainId),
      wallet ? readNativeBalance(wallet, escrowChainId) : Promise.resolve(undefined),
    ]);

    const predictedJobId = jobCounter + BigInt(1);
    const expiredAt =
      BigInt(Math.floor(Date.now() / 1000)) +
      BigInt(disputeWindow) +
      BigInt(extraDeadline);

    const approve = encodeApprove(budgetWei, escrowChainId);
    const createJob = encodeCreateJob({
      provider: provider.address,
      expiredAt,
      description: task,
      chainId: escrowChainId,
    });

    return NextResponse.json({
      success: true,
      data: {
        chainId: stack.chainId,
        addresses: stack,
        provider: {
          address: provider.address,
          label: provider.label,
          genesisSlug: provider.genesisSlug,
          role: provider.role,
          note: "Escrow counterparty (seller identity) — not a pay-to address.",
        },
        budgetU,
        budgetWei: budgetWei.toString(),
        tokenSymbol: token.symbol || "U",
        tokenDecimals: token.decimals || 18,
        predictedJobId: predictedJobId.toString(),
        disputeWindowSeconds: disputeWindow,
        expiredAt: Number(expiredAt),
        deadlineSeconds: extraDeadline,
        estimatedGasBnb: estimatedGasFor(escrowChainId),
        minBnb: minBnbFor(escrowChainId),
        wallet: wallet
          ? {
              address: wallet,
              uBalanceWei: token.balanceWei || "0",
              uAllowanceWei: token.allowanceWei || "0",
              bnbWei: bnbWei != null ? bnbWei.toString() : "0",
              needsApprove:
                BigInt(token.allowanceWei || "0") < budgetWei,
              enoughU: BigInt(token.balanceWei || "0") >= budgetWei,
            }
          : null,
        calls: {
          approve,
          createJob,
        },
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Escrow quote failed",
      },
      { status: 500 },
    );
  }
}
