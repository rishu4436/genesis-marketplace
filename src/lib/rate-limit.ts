/**
 * Soft in-process + optional KV rate limit. Fail-open if KV is down
 * still uses memory so a noisy client cannot stampede plan package runs.
 */

import { kvCmd } from "./kv";

const memory = new Map<string, { n: number; resetAt: number }>();

export async function allowRate(opts: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<{ ok: boolean; retryAfterSec: number }> {
  const kvKey = `genesis:rl:${opts.key}`;
  const n = await kvCmd<number>("INCR", kvKey);
  if (typeof n === "number" && Number.isFinite(n)) {
    if (n === 1) await kvCmd("EXPIRE", kvKey, opts.windowSec);
    if (n > opts.limit) {
      const ttl = await kvCmd<number>("TTL", kvKey);
      return {
        ok: false,
        retryAfterSec: Math.max(1, Number(ttl) > 0 ? Number(ttl) : opts.windowSec),
      };
    }
    return { ok: true, retryAfterSec: 0 };
  }

  const now = Date.now();
  const cur = memory.get(opts.key);
  if (!cur || cur.resetAt <= now) {
    memory.set(opts.key, { n: 1, resetAt: now + opts.windowSec * 1000 });
    return { ok: true, retryAfterSec: 0 };
  }
  cur.n += 1;
  if (cur.n > opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip =
    xf.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "local";
  return ip.slice(0, 64);
}
