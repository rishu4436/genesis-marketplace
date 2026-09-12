import { NextResponse } from "next/server";
import { loginEmail, publicAccount } from "@/lib/accounts";
import { loginAccount } from "@/lib/session";
import { rateGate } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = await rateGate(req, "login", 10, 15 * 60);
  if (limited) return limited;
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const acc = await loginEmail(body.email || "", body.password || "");
    await loginAccount(acc);
    return NextResponse.json({ success: true, data: publicAccount(acc) });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Sign in failed" },
      { status: 401 },
    );
  }
}
