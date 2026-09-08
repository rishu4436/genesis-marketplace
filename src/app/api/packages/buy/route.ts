import { NextResponse } from "next/server";
import { getPackage, packagePricing } from "@/lib/packages";
import { createJobWithLiveNegotiate } from "@/lib/hire-engine";
import { saveJob } from "@/lib/job-store";
import type { HireJob } from "@/lib/hire-engine";
import { allowRate, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/packages/buy
 * Buy a multi-agent package — sequential hire for each specialist.
 */
export async function POST(req: Request) {
  try {
    const gated = await allowRate({
      key: `packages:${clientIp(req)}`,
      limit: 6,
      windowSec: 10 * 60,
    });
    if (!gated.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many package runs. Wait a few minutes — plans are still free.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(gated.retryAfterSec) },
        },
      );
    }
    const body = (await req.json()) as {
      packageId?: string;
      taskOverrides?: Record<string, string>;
    };
    const pkg = body.packageId ? getPackage(body.packageId) : undefined;
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Unknown package" },
        { status: 404 },
      );
    }

    const { agents, total } = packagePricing(pkg);
    const jobs: HireJob[] = [];

    for (const agent of agents) {
      const task =
        body.taskOverrides?.[agent.slug] ||
        pkg.tasks[agent.slug] ||
        `Package job for ${agent.name}`;
      const job = await createJobWithLiveNegotiate({
        chainId: agent.chainId ?? 56,
        tokenId: agent.tokenId || `genesis:${agent.slug}`,
        agentName: agent.name,
        genesisSlug: agent.slug,
        categoryId: agent.categoryId,
        task,
        budgetUsd: String(agent.basePriceUsd),
        duration: "once",
        risk: "medium",
        notes: `package:${pkg.id}`,
        autoFulfill: true,
      });
      try {
        await saveJob(job);
      } catch {
        /* continue */
      }
      jobs.push(job);
    }

    return NextResponse.json({
      success: true,
      data: {
        packageId: pkg.id,
        packageName: pkg.name,
        listedSkuUsd: total,
        chargedUsd: 0,
        settlement: "none",
        tier: "full",
        note: "Plan-only bundle. Listed $ is a SKU, not a charge.",
        jobs,
        jobIds: jobs.map((j) => j.id),
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Package buy failed",
      },
      { status: 500 },
    );
  }
}
