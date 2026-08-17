import { NextResponse } from "next/server";
import { publicAccount } from "@/lib/accounts";
import { currentAccount } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Not signed in" },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, data: publicAccount(acc) });
}
