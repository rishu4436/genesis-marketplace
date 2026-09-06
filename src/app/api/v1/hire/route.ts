import { POST as hirePost } from "@/app/api/hire/route";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/v1/hire
 * Same body as POST /api/hire — machine buyers (TermiX-class).
 */
export const POST = hirePost;
