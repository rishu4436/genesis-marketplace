import { NextResponse } from "next/server";
import { createJobWithLiveNegotiate, fulfillJobAsync } from "@/lib/hire-engine";
import type { EscrowRecord } from "@/lib/hire-engine";
import { deliverableSchemaValid, sealJob } from "@/lib/job-receipt";
import { saveJob } from "@/lib/job-store";
import { attachJob } from "@/lib/accounts";
import { currentAccount } from "@/lib/session";
import { getGenesisAgent } from "@/lib/genesis-agents";
import {
  ERC8183_MAINNET,
  formatU,
  isHexAddress,
  isTxHash,
  resolveEscrowProvider,
} from "@/lib/erc8183-escrow";
import {
  hasOnchainDeliverable,
  readDisputeWindow,
  readOnchainJob,
} from "@/lib/erc8183-read";
import { a2aNotifyFunded, getPlatformConfig } from "@/lib/platform-a2a";
import { BSC_MAINNET_CHAIN_ID } from "@/lib/pins";
import type { CategoryId } from "@/lib/categories";
import type { HireIntent } from "@/lib/hire";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/escrow/fund
 * After the buyer wallet funds ERC-8183, persist a /jobs receipt and notify the seller.
 * Does not invent tx hashes. Does not mark Delivered without a payload.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      genesisSlug?: string;
      chainId?: number;
      tokenId?: string;
      agentName?: string;
      categoryId?: CategoryId | null;
      task?: string;
      wallet?: string;
      onchainJobId?: string;
      fundTx?: string;
      createTx?: string;
      approveTx?: string;
      budgetUsd?: string;
      duration?: HireIntent["duration"];
      risk?: HireIntent["risk"];
    };

    const task = (body.task || "").trim();
    if (task.length <= 8) {
      return NextResponse.json(
        { success: false, error: "task is required" },
        { status: 400 },
      );
    }
    if (!isHexAddress(body.wallet)) {
      return NextResponse.json(
        { success: false, error: "wallet is required" },
        { status: 400 },
      );
    }
    const onchainId = BigInt(body.onchainJobId || "0");
    if (onchainId <= BigInt(0)) {
      return NextResponse.json(
        { success: false, error: "onchainJobId required" },
        { status: 400 },
      );
    }
    if (!isTxHash(body.fundTx)) {
      return NextResponse.json(
        { success: false, error: "fundTx (BSC mainnet hash) is required" },
        { status: 400 },
      );
    }

    const provider = resolveEscrowProvider({
      genesisSlug: body.genesisSlug,
      chainId: body.chainId,
      tokenId: body.tokenId,
    });
    if (!provider) {
      return NextResponse.json(
        { success: false, error: "No ERC-8183 provider identity for this listing" },
        { status: 400 },
      );
    }

    const chainJob = await readOnchainJob(onchainId);
    if (chainJob.client.toLowerCase() !== body.wallet.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "On-chain job client does not match the connected wallet",
        },
        { status: 400 },
      );
    }
    if (chainJob.provider.toLowerCase() !== provider.address.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "On-chain provider does not match this listing’s escrow counterparty",
        },
        { status: 400 },
      );
    }
    if (chainJob.statusName !== "FUNDED" && chainJob.statusName !== "SUBMITTED") {
      return NextResponse.json(
        {
          success: false,
          error: `On-chain job is ${chainJob.statusName}, not FUNDED`,
        },
        { status: 400 },
      );
    }

    const g = body.genesisSlug ? getGenesisAgent(body.genesisSlug) : undefined;
    const disputeWindow = await readDisputeWindow();

    let job = await createJobWithLiveNegotiate({
      chainId: BSC_MAINNET_CHAIN_ID,
      tokenId: String(
        (g?.tokenId && g.chainId === 56 ? g.tokenId : null) ||
          (body.genesisSlug ? `genesis:${body.genesisSlug}` : body.tokenId || ""),
      ),
      agentName: g?.name || body.agentName || provider.label,
      genesisSlug: body.genesisSlug,
      categoryId: body.categoryId ?? g?.categoryId,
      task,
      budgetUsd: body.budgetUsd || String(g?.basePriceUsd ?? 8),
      duration: body.duration || "once",
      risk: body.risk || "medium",
      notes: "tier:escrow",
      autoFulfill: false,
      tier: "escrow",
    });

    const escrow: EscrowRecord = {
      protocol: "ERC-8183",
      chainId: 56,
      onchainJobId: chainJob.id,
      token: ERC8183_MAINNET.paymentToken,
      tokenSymbol: "U",
      amountWei: chainJob.budget,
      amountU: formatU(BigInt(chainJob.budget)),
      buyer: body.wallet,
      provider: provider.address,
      commerce: ERC8183_MAINNET.commerce,
      router: ERC8183_MAINNET.router,
      policy: ERC8183_MAINNET.policy,
      createTx: isTxHash(body.createTx) ? body.createTx : undefined,
      fundTx: body.fundTx,
      approveTx: isTxHash(body.approveTx) ? body.approveTx : undefined,
      chainStatus: chainJob.statusName,
      submittedAt: chainJob.submittedAt || undefined,
      disputeWindowSeconds: disputeWindow,
      expiredAt: chainJob.expiredAt,
    };

    const at = new Date().toISOString();
    job = {
      ...job,
      tier: "escrow",
      status: "funded",
      updatedAt: at,
      escrow,
      quote: {
        priceUsd: job.quote?.priceUsd ?? g?.basePriceUsd ?? 8,
        currency: "U",
        etaMinutes: job.quote?.etaMinutes ?? g?.etaMinutes ?? 2,
        protocol: "ERC-8183",
        expiresAt: job.quote?.expiresAt || at,
        notes: "On-chain ERC-8183 lock · settle after deliverable",
        live: true,
        tier: "escrow",
      },
      timeline: [
        ...job.timeline,
        {
          at,
          status: "funded",
          detail: `ERC-8183 funded · on-chain job ${chainJob.id}`,
        },
      ],
    };

    let notify: { ok: boolean; error?: string } | undefined;
    if (body.genesisSlug) {
      const platform = getPlatformConfig(body.genesisSlug);
      if (platform) {
        const clientId = process.env[platform.clientIdEnv];
        const clientSecret = process.env[platform.clientSecretEnv];
        notify = await a2aNotifyFunded({
          a2aUrl: platform.a2aUrl,
          agentId: platform.agentId,
          jobId: Number(chainJob.id),
          clientId: clientId || undefined,
          clientSecret: clientSecret || undefined,
        });
        job.timeline.push({
          at: new Date().toISOString(),
          status: "funded",
          detail: notify.ok
            ? "Seller notified (notify_funded)"
            : `notify_funded failed: ${notify.error || "timeout"}`,
        });
      }
    }

    if (body.genesisSlug) {
      try {
        job = await fulfillJobAsync(job);
      } catch {
        /* keep funded — never invent a payload */
      }
    }

    const payloadOk =
      deliverableSchemaValid(job.deliverable) &&
      (Boolean(job.genesisSlug) || job.quote?.live === true);
    const chainHasPayload = hasOnchainDeliverable(chainJob.deliverable);

    if (job.status === "delivered" && !payloadOk && !chainHasPayload) {
      job = {
        ...job,
        status: "funded",
        deliverable: undefined,
        updatedAt: new Date().toISOString(),
        timeline: [
          ...job.timeline,
          {
            at: new Date().toISOString(),
            status: "funded",
            detail: "Escrow funded · awaiting deliverable",
          },
        ],
      };
    }

    try {
      const acc = await currentAccount();
      if (acc) {
        job.ownerId = acc.id;
        await attachJob(acc.id, job.id);
      }
      job = await saveJob(job);
    } catch {
      job = sealJob(job, { resign: true });
    }

    return NextResponse.json({
      success: true,
      data: job,
      sharePath: `/jobs/${encodeURIComponent(job.id)}`,
      notify,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Escrow fund persist failed",
      },
      { status: 500 },
    );
  }
}
