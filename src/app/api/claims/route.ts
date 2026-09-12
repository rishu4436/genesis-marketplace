import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";
import { listClaims } from "@/lib/seller-claims";

export const runtime = "nodejs";

export async function GET() {
  const data = await listClaims(40);
  return NextResponse.json({ success: true, data });
}

/** Legacy open claims are closed. Use /sell two-gate listing. */
export async function POST() {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in required. List from /sell." },
      { status: 401 },
    );
  }
  return NextResponse.json(
    {
      success: false,
      error:
        "Open claims are closed. Sign in with the owning wallet on /sell.",
    },
    { status: 410 },
  );
}
