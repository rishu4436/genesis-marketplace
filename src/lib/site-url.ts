/**
 * Canonical public host. The live contest site is -one.
 * Never emit the stale genesis-marketplace.vercel.app alias or an
 * ephemeral *.vercel.app deployment URL (VERCEL_URL).
 */

export const PRODUCTION_SITE_URL =
  "https://genesis-marketplace-one.vercel.app";

const STALE_HOST = /^https?:\/\/genesis-marketplace\.vercel\.app\/?$/i;

function isEphemeralVercel(url: string): boolean {
  return (
    /\.vercel\.app$/i.test(url) &&
    !/genesis-marketplace-one\.vercel\.app/i.test(url)
  );
}

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  if (env && !STALE_HOST.test(env) && !isEphemeralVercel(env)) return env;
  return PRODUCTION_SITE_URL;
}
