/** Shared Upstash / Vercel KV REST helper. */

export function kvEnabled() {
  return Boolean(kvUrl() && kvToken());
}

function kvUrl() {
  return (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ""
  );
}

function kvToken() {
  return (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ""
  );
}

export async function kvCmd<T = unknown>(
  ...cmd: (string | number)[]
): Promise<T | null> {
  if (!kvEnabled()) return null;
  try {
    const res = await fetch(`${kvUrl()!.replace(/\/$/, "")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}
