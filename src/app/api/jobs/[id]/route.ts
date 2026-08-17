import { NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const job = await getJob(decodeURIComponent(id));
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: job });
}
