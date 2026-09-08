import { NextResponse } from "next/server";
import {
  budgetUFor,
  budgetWeiFor,
  DEADLINE_SECONDS,
  encodeApprove,
  encodeCreateJob,
  ERC8183_MAINNET,
  ESTIMATED_GAS_BNB,
  isHexAddress,
  MIN_BNB_BNB,
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

    const budgetU = body.budgetU || budgetUFor({ genesisSlug: body.genesisSlug });
    const budgetWei = budgetWeiFor({
      genesisSlug: body.genesisSlug,
      budgetU,
    });

    const wallet = isHexAddress(body.wallet) ? body.wallet : undefined;

    const [disputeWindow, jobCounter, token, bnbWei] = await Promise.all([
      readDisputeWindow(),
      readJobCounter(),
      readTokenSnapshot(wallet),
      wallet ? readNativeBalance(wallet) : Promise.resolve(undefined),
    ]);

    const predictedJobId = jobCounter + BigInt(1);
    const expiredAt =
      BigInt(Math.floor(Date.now() / 1000)) +
      BigInt(disputeWindow) +
      BigInt(DEADLINE_SECONDS);

    const approve = encodeApprove(budgetWei);
    const createJob = encodeCreateJob({
      provider: provider.address,
      expiredAt,
      description: task,
    });

    return NextResponse.json({
      success: true,
      data: {
        chainId: ERC8183_MAINNET.chainId,
        addresses: ERC8183_MAINNET,
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
        deadlineSeconds: DEADLINE_SECONDS,
        estimatedGasBnb: ESTIMATED_GAS_BNB,
        minBnb: MIN_BNB_BNB,
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
