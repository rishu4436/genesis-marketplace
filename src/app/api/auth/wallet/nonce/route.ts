import { NextResponse } from "next/server";
import { issueNonce, loginMessage } from "@/lib/accounts";
import { rateGate } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = await rateGate(req, "nonce", 20, 10 * 60);
  if (limited) return limited;
  const nonce = await issueNonce();
  return NextResponse.json({
    success: true,
    data: { nonce, message: loginMessage(nonce) },
  });
}
