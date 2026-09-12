import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";
import {
  hydrateSellerListings,
  listingsForAccount,
} from "@/lib/seller-listings";
import { listJobs } from "@/lib/job-store";

export const runtime = "nodejs";

export async function GET() {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in required" },
      { status: 401 },
    );
  }
  await hydrateSellerListings();
  const listings = listingsForAccount(acc.id);
  const tokens = new Set(listings.map((l) => String(l.tokenId)));
  const jobs = tokens.size
    ? (await listJobs(80)).filter((j) => tokens.has(String(j.tokenId)))
    : [];
  return NextResponse.json({
    success: true,
    data: {
      wallet: acc.wallet || null,
      listings,
      jobs: jobs.map((j) => ({
        id: j.id,
        agentName: j.agentName,
        tokenId: j.tokenId,
        status: j.status,
        task: j.task,
        escrowStatus: j.escrow?.chainStatus || null,
        onchainJobId: j.escrow?.onchainJobId || null,
        href: `/jobs/${j.id}`,
      })),
    },
  });
}
