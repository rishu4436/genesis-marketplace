import { NextResponse } from "next/server";
import { loginOrCreateWallet, publicAccount } from "@/lib/accounts";
import { loginAccount } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      address?: string;
      signature?: string;
      nonce?: string;
    };
    if (!body.address || !body.signature || !body.nonce) {
      return NextResponse.json(
        { success: false, error: "Wallet, signature, and nonce required" },
        { status: 400 },
      );
    }
    const acc = await loginOrCreateWallet(
      body.address,
      body.signature,
      body.nonce,
    );
    await loginAccount(acc);
    return NextResponse.json({ success: true, data: publicAccount(acc) });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Wallet sign-in failed" },
      { status: 401 },
    );
  }
}
