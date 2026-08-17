import { NextResponse } from "next/server";
import {
  listClaims,
  newClaimId,
  saveClaim,
  type SellerClaim,
} from "@/lib/seller-claims";

export const runtime = "nodejs";

export async function GET() {
  const data = await listClaims(40);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SellerClaim>;
    if (!body.tokenId || !body.displayName?.trim()) {
      return NextResponse.json(
        { success: false, error: "tokenId and displayName required" },
        { status: 400 },
      );
    }
    const claim: SellerClaim = {
      id: newClaimId(),
      chainId: Number(body.chainId || 56),
      tokenId: String(body.tokenId),
      ownerAddress: (body.ownerAddress || "0xclaim-pending").slice(0, 42),
      displayName: body.displayName.trim(),
      skills: Array.isArray(body.skills)
        ? body.skills.map(String).slice(0, 8)
        : [],
      priceUsd: Number(body.priceUsd) > 0 ? Number(body.priceUsd) : 10,
      serviceUrl: body.serviceUrl?.replace(/\/$/, ""),
      x402: Boolean(body.x402),
      pitch: (body.pitch || "").slice(0, 500),
      claimedAt: new Date().toISOString(),
      status: "listed",
    };
    const saved = await saveClaim(claim);
    return NextResponse.json({ success: true, data: saved });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "claim failed",
      },
      { status: 500 },
    );
  }
}
