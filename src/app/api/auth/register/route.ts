import { NextResponse } from "next/server";
import { createEmailAccount, publicAccount } from "@/lib/accounts";
import { loginAccount } from "@/lib/session";
import { rateGate } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = await rateGate(req, "register", 5, 15 * 60);
  if (limited) return limited;
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    const acc = await createEmailAccount({
      email: body.email || "",
      password: body.password || "",
      displayName: body.displayName,
    });
    await loginAccount(acc);
    return NextResponse.json({ success: true, data: publicAccount(acc) });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Sign up failed" },
      { status: 400 },
    );
  }
}
