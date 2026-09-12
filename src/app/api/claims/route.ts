import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in required" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    success: true,
    data: [],
    note: "Claim dump is closed. Use /sell.",
  });
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
