import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const base =
  process.env.CHECK_BASE || "https://genesis-marketplace-one.vercel.app";

async function get(path) {
  const res = await fetch(`${base}${path}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* */
  }
  return { status: res.status, json };
}

console.log("=== Production", base, "===\n");

const home = await fetch(base);
console.log("Home HTTP", home.status);

for (const path of [
  "/api/ai/status",
  "/api/altana/status",
  "/api/agents/health",
  "/api/outcomes",
]) {
  const r = await get(path);
  console.log("\n" + path, "HTTP", r.status);
  if (path === "/api/ai/status") {
    console.log("  AI enabled:", r.json?.data?.enabled);
  }
  if (path === "/api/altana/status") {
    console.log("  Altana mode:", r.json?.data?.mode);
    console.log("  liveCapable:", r.json?.data?.liveCapable);
    console.log("  network:", r.json?.data?.network, r.json?.data?.chainId);
  }
  if (path === "/api/agents/health") {
    for (const a of r.json?.data || []) {
      console.log(
        `  ${a.slug}: ${a.label} (${a.status}) platform=${a.platform}`,
      );
    }
  }
  if (path === "/api/outcomes") {
    const d = r.json?.data;
    console.log(
      `  jobs=${d?.totalJobs} delivered=${d?.delivered} success=${d?.successRate}%`,
    );
  }
}

// Platform cards
console.log("\n=== Platform agent cards ===");
const cards = [
  process.env.RANGEKEEPER_CARD_URL,
  process.env.YIELDROUTER_CARD_URL,
  process.env.HEALTHSENTINEL_CARD_URL,
].filter(Boolean);
for (const url of cards) {
  const res = await fetch(url);
  console.log(res.status, url.slice(0, 70) + "…");
}

// Local OAuth probe
console.log("\n=== Local OAuth (RangeKeeper) ===");
const id =
  process.env.RANGEKEEPER_CLIENT_ID || process.env.PLATFORM_CLIENT_ID;
const secret =
  process.env.RANGEKEEPER_CLIENT_SECRET || process.env.PLATFORM_CLIENT_SECRET;
const agentId = process.env.RANGEKEEPER_AGENT_ID;
const tokenUrl =
  process.env.PLATFORM_TOKEN_URL ||
  "https://bnbagent-api.bnbchain.world/v1/oauth/token";
if (!id || !secret || !agentId) {
  console.log("Missing client id/secret/agent id in .env.local");
} else {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
    scope: `invoke:${agentId}`,
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await res.json().catch(() => ({}));
  console.log("oauth HTTP", res.status, "token=", Boolean(j.access_token));
  if (!j.access_token)
    console.log("error:", j.error || j.error_description || j.message || j);
}

// Production hire soft path
console.log("\n=== Production soft hire (RangeKeeper) ===");
const hire = await fetch(`${base}/api/hire`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chainId: 56,
    tokenId: "1773",
    agentName: "RangeKeeper",
    genesisSlug: "range-keeper",
    categoryId: "rebalancing",
    task: "Rebalance PCS V3 CAKE/USDT LP with 6 percent band",
    budgetUsd: "8",
    duration: "once",
    risk: "medium",
    tier: "full",
    autoFulfill: true,
  }),
});
const hj = await hire.json();
console.log(
  "hire",
  hire.status,
  "success=",
  hj.success,
  "status=",
  hj.data?.status,
  "liveQuote=",
  hj.data?.quote?.live,
  "protocol=",
  hj.data?.quote?.protocol,
);
if (hj.data?.timeline?.length) {
  console.log(
    "timeline last:",
    hj.data.timeline[hj.data.timeline.length - 1]?.detail,
  );
}

// Altana grant demo
console.log("\n=== Production Altana grant (demo) ===");
const ag = await fetch(`${base}/api/altana/sessions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ agentSlug: "range-keeper", forceDemo: true }),
});
const aj = await ag.json();
console.log(
  "altana",
  ag.status,
  "mode=",
  aj.data?.mode,
  "status=",
  aj.data?.status,
  "tx=",
  aj.data?.transactionHash || "none",
  "explorer=",
  aj.data?.explorerUrl || "none",
);

console.log("\n=== Keys in .env.local (presence only) ===");
for (const k of [
  "XAI_API_KEY",
  "ALTANA_ADMIN_PRIVATE_KEY",
  "PLATFORM_CLIENT_ID",
  "RANGEKEEPER_CLIENT_ID",
  "YIELDROUTER_CLIENT_ID",
  "HEALTHSENTINEL_CLIENT_ID",
]) {
  console.log(k, process.env[k] ? "SET" : "MISSING");
}
