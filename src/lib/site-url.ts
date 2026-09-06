/**
 * Canonical public host. The live contest site is -one.
 * genesis-marketplace.vercel.app is a stale alias — never emit it.
 */

export const PRODUCTION_SITE_URL =
  "https://genesis-marketplace-one.vercel.app";

const STALE_HOST = /^https?:\/\/genesis-marketplace\.vercel\.app\/?$/i;

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  if (env && !STALE_HOST.test(env)) return env;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "") || "";
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    if (!STALE_HOST.test(host)) return host.replace(/\/$/, "");
  }
  return PRODUCTION_SITE_URL;
}
