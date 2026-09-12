import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { formatLockU } from "@/lib/erc8183-escrow";
import { isPublicHireableUrl } from "@/lib/hire-class";
import { probeA2aUrl } from "@/lib/probe-a2a";
import {
  getListing,
  saveListing,
  type SellerListing,
} from "@/lib/seller-listings";
import { sameWallet } from "@/lib/erc8004-owner";

export const runtime = "nodejs";
export const maxDuration = 20;

const CAT = new Set(CATEGORIES.map((c) => c.id));

export async function POST(req: Request) {
  try {
    const acc = await currentAccount();
    if (!acc?.wallet) {
      return NextResponse.json(
        { success: false, error: "Sign in with the listing wallet." },
        { status: 401 },
      );
    }
    const body = (await req.json()) as {
      listingId?: string;
      name?: string;
      categoryId?: string;
      a2aUrl?: string;
      youSend?: string;
      youGet?: string;
      lockU?: string;
      quoteOnly?: boolean;
    };
    const listing = body.listingId ? getListing(body.listingId) : null;
    if (!listing || listing.accountId !== acc.id) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 },
      );
    }
    if (!sameWallet(listing.ownerAddress, acc.wallet)) {
      return NextResponse.json(
        { success: false, error: "Wallet does not match this listing." },
        { status: 403 },
      );
    }
    const categoryId = body.categoryId as CategoryId | undefined;
    if (!categoryId || !CAT.has(categoryId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Pick one job: rebalancing, grid, yield, or health factor.",
        },
        { status: 400 },
      );
    }
    const a2aUrl = (body.a2aUrl || "").trim();
    if (!isPublicHireableUrl(a2aUrl)) {
      return NextResponse.json(
        { success: false, error: "Public https A2A URL required." },
        { status: 400 },
      );
    }
    const quoteOnly = Boolean(body.quoteOnly) || !String(body.lockU || "").trim();
    let lockU: string | null = null;
    if (!quoteOnly) {
      const n = Number(body.lockU);
      lockU = formatLockU(n) || null;
      if (!lockU) {
        return NextResponse.json(
          { success: false, error: "Lock $U must be a positive number, or mark quote only." },
          { status: 400 },
        );
      }
    }
    const probe = await probeA2aUrl(a2aUrl);
    const next: SellerListing = {
      ...listing,
      name: (body.name || listing.name || probe.name || `Agent #${listing.tokenId}`).trim(),
      categoryId,
      a2aUrl,
      youSend: (body.youSend || "").trim().slice(0, 240),
      youGet: (body.youGet || "").trim().slice(0, 240),
      lockU,
      quoteOnly,
      probeOk: probe.ok,
      probeAt: new Date().toISOString(),
      probeError: probe.ok ? undefined : probe.error,
      gate: probe.ok ? "hireable" : "indexed",
    };
    const saved = await saveListing(next);
    return NextResponse.json({
      success: true,
      data: saved,
      probe,
      note: saved.gate === "hireable"
        ? "On the hire floor. Buyers see the job ticket."
        : "Still Indexed. A2A probe did not pass — not hireable.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Ticket failed",
      },
      { status: 500 },
    );
  }
}
