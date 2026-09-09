import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CLOSED = {
  success: false,
  error: "Escrow is BSC mainnet only. The testnet drip is closed.",
};

/** POST /api/escrow/testnet-topup — retired. Desk escrow is chain 56. */
export async function POST() {
  return NextResponse.json(CLOSED, { status: 410 });
}

export async function GET() {
  return NextResponse.json(CLOSED, { status: 410 });
}
