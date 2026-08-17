import { NextResponse } from "next/server";
import { publicAccount, saveAccount, type Account } from "@/lib/accounts";
import { currentAccount } from "@/lib/session";
import type { BuyerRisk } from "@/lib/buyer-context";

export const runtime = "nodejs";

export async function GET() {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in to open your profile" },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, data: publicAccount(acc) });
}

export async function PUT(req: Request) {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in to save your profile" },
      { status: 401 },
    );
  }
  const body = (await req.json()) as {
    displayName?: string;
    risk?: BuyerRisk;
  };
  const next: Account = { ...acc };
  if (typeof body.displayName === "string") {
    next.displayName = body.displayName.trim().slice(0, 80);
  }
  if (
    body.risk === "conservative" ||
    body.risk === "moderate" ||
    body.risk === "aggressive"
  ) {
    next.risk = body.risk;
  }
  await saveAccount(next);
  return NextResponse.json({ success: true, data: publicAccount(next) });
}
