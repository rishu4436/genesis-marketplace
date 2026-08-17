import { NextResponse } from "next/server";
import { issueNonce, loginMessage } from "@/lib/accounts";

export const runtime = "nodejs";

export async function GET() {
  const nonce = issueNonce();
  return NextResponse.json({
    success: true,
    data: { nonce, message: loginMessage(nonce) },
  });
}
