/**
 * Probe BSC ERC-8004 agents and write config/hireable-bsc.json.
 * Candidates: Census alive pages + 8004scan A2A/MCP pages + Brain /find.
 * Hireable = public https A2A card, A2A RPC, or MCP initialize answered.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(resolve(import.meta.dirname, "..", ".env.local"));
loadEnvFile(resolve(import.meta.dirname, "..", ".env"));

const SCAN_KEY = (process.env.SCAN_API_KEY || "").trim();
const SCAN_HEADERS = {
  Accept: "application/json",
  ...(SCAN_KEY ? { "X-API-Key": SCAN_KEY } : {}),
};
console.log("8004scan key", SCAN_KEY ? "present" : "MISSING");

const CENSUS = "https://agentcensus.xyz/api/agents";
const SCAN = "https://api.8004scan.io/api/v1/agents";
const BRAIN = "https://agent.brainonbnb.com/find";
const OUT = resolve(import.meta.dirname, "..", "config", "hireable-bsc.json");

const CATEGORIES = {
  rebalancing: ["rebalanc", "lp range", "concentrated liquidity", "out of range"],
  "grid-trading": ["grid trad", "grid planner", "grid bot", "market making"],
  "yield-optimisation": [
    "yield",
    "apr",
    "apy",
    "fee tier",
    "farm",
    "vault",
  ],
  "health-factor": [
    "health factor",
    "liquidation",
    "borrow",
    "collateral ratio",
  ],
};

const BLOCK =
  /localhost|127\.0\.0\.1|\.example\.|bedrock-agentcore|execute-api\.|github\.com|s3[\w.-]*\.amazonaws\.com|8004scan\.io\/api|agentscan|toly\.me|x\.com|twitter\.com|t\.me|clipx\.app/i;
const TEST =
  /\(test\)|test deployment|not for production use/i;
const JUNK =
  /^(test\.agent|test agent|foo\.agent|defibot|tradepilot|defimatrix)(\.agent)?$/i;

function okUrl(u) {
  if (!u || typeof u !== "string") return false;
  const s = u.trim();
  if (!/^https:\/\//i.test(s) || s.length < 24) return false;
  if (BLOCK.test(s)) return false;
  if (/^(https:\/\/)(10\.|192\.168\.|127\.|169\.254\.)/.test(s)) return false;
  return true;
}

function isClone(name, desc) {
  const n = (name || "").trim();
  const hay = `${n} ${desc || ""}`.toLowerCase();
  if (/singularry/.test(hay)) return true;
  if (/autonomous trading agent \(simple-mode\)/.test(hay)) return true;
  if (/clipx/.test(hay)) return true;
  if (/\btest(ing)?\b/.test(n.toLowerCase())) return true;
  if (/^agent$/.test(n.toLowerCase()) && /defai superapp/.test(hay)) return true;
  return false;
}

function categorize(name, desc, censusCat) {
  const hay = `${name} ${desc}`.toLowerCase();
  let best = null;
  for (const [id, kws] of Object.entries(CATEGORIES)) {
    let n = 0;
    for (const kw of kws) if (hay.includes(kw)) n += 1;
    if (n > 0 && (!best || n > best.n)) best = { id, n };
  }
  if (best) return best.id;
  const mapped = String(censusCat || "").toLowerCase();
  if (mapped === "grid-trading" || mapped === "grid") return "grid-trading";
  if (mapped === "health-factor" || mapped === "health") return "health-factor";
  if (mapped === "yield" || mapped === "yield-optimisation") return "yield-optimisation";
  if (mapped === "rebalancing" || mapped === "rebalance") return "rebalancing";
  return null;
}

function leak(name, desc) {
  const n = (name || "").trim();
  const d = (desc || "").trim();
  if (!n) return true;
  if (JUNK.test(n)) return true;
  if (TEST.test(n) || TEST.test(d)) return true;
  if (/^test\./i.test(n) || /test\.agent/i.test(n)) return true;
  return false;
}

function parseEps(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p.map(String);
  } catch {
    /* */
  }
  return [];
}

function addUrl(urls, u) {
  if (okUrl(u) && !urls.includes(u.trim())) urls.push(u.trim());
}

function pickUrls(agent) {
  const urls = [];
  addUrl(urls, agent.a2a_endpoint);
  addUrl(urls, agent.a2a);
  addUrl(urls, agent.mcp_endpoint);
  addUrl(urls, agent.agent_card);
  addUrl(urls, agent.agent_card_url);
  for (const e of parseEps(agent.service_endpoints)) addUrl(urls, e);
  for (const e of agent.endpoints || []) {
    if (typeof e === "string") addUrl(urls, e);
    else if (e && typeof e === "object") addUrl(urls, e.endpoint || e.url);
  }
  for (const s of agent.services || []) {
    if (typeof s === "string") addUrl(urls, s);
    else if (s && typeof s === "object") addUrl(urls, s.endpoint || s.url);
  }
  const a2a = urls.filter((u) => /\/a2a(\/|$|\?)|agent-card\.json/i.test(u));
  const mcp = urls.filter((u) => /\/mcp(\/|$|\?)/i.test(u));
  return [...a2a, ...mcp];
}

async function getJson(url, ms, init = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(ms),
      headers: {
        Accept: "application/json",
        ...(url.includes("8004scan.io") ? SCAN_HEADERS : {}),
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, data: null, ms: Date.now() - t0, error: String(e.message || e) };
  }
}

function looksCard(data) {
  if (!data || typeof data !== "object") return false;
  const o = data;
  return Boolean(
    o.name || o.skills || o.capabilities || o.url || o.endpoints || o.protocol,
  );
}

async function probe(url) {
  const get = await getJson(url, 4000);
  if (get.ok && looksCard(get.data)) {
    return { ok: true, kind: /mcp/i.test(url) ? "mcp" : "a2a-card", ms: get.ms };
  }
  const initBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "0.2.9",
      clientInfo: { name: "genesis-marketplace", version: "0.1.0" },
      capabilities: {},
    },
  });
  const post = await getJson(url, 4000, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: initBody,
  });
  if (post.data && (post.data.result || post.data.jsonrpc)) {
    return { ok: true, kind: /mcp/i.test(url) ? "mcp" : "a2a-rpc", ms: post.ms };
  }
  const a2a = await getJson(url, 4000, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "message/send",
      params: { message: { role: "user", parts: [{ type: "text", text: "ping" }] } },
    }),
  });
  if (a2a.data && (a2a.data.result || a2a.data.jsonrpc) && !a2a.data.error) {
    return { ok: true, kind: "a2a-rpc", ms: a2a.ms };
  }
  return { ok: false, kind: null, ms: get.ms };
}

async function censusPages() {
  const out = [];
  let registered = 0;
  const pages = await Promise.all(
    Array.from({ length: 13 }, (_, i) =>
      getJson(`${CENSUS}?net=mainnet&page=${i + 1}`, 8000),
    ),
  );
  for (const p of pages) {
    if (typeof p.data?.total === "number") registered = p.data.total;
    for (const row of p.data?.agents || []) {
      if (row.probe_status !== "alive") continue;
      out.push({
        token_id: String(row.agent_id),
        name: row.name || `Agent #${row.agent_id}`,
        description: row.description || "",
        owner: row.owner,
        service_endpoints: row.service_endpoints,
        census_category: row.category,
      });
    }
  }
  return { registered, rows: out };
}

function scanRows(data) {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.agents)) return data.agents;
  return [];
}

function asScanAgent(a) {
  return {
    token_id: String(a.token_id ?? a.agent_id ?? ""),
    name: a.name || `Agent #${a.token_id}`,
    description: a.description || "",
    owner: a.owner_address,
    a2a_endpoint: a.a2a_endpoint,
    mcp_endpoint: a.mcp_endpoint,
    endpoints: a.endpoints,
    services: a.services,
    agent_card: a.agent_card || a.agent_card_url,
    supported_protocols: a.supported_protocols,
  };
}

async function scanGet(params, retries = 2) {
  const q = new URLSearchParams(params);
  const url = `${SCAN}?${q}`;
  let last = { rows: [], total: 0 };
  for (let i = 0; i <= retries; i++) {
    const p = await getJson(url, 16000);
    const rows = scanRows(p.data);
    if (p.ok && rows.length) {
      return { rows, total: p.data?.total ?? rows.length };
    }
    last = { rows, total: p.data?.total ?? 0 };
    if (p.status && p.status !== 500 && p.status !== 502 && p.status !== 0) {
      break;
    }
  }
  return last;
}

async function scanProtocol(protocol, maxPages) {
  const out = [];
  let misses = 0;
  for (let page = 0; page < maxPages; page++) {
    const { rows } = await scanGet({
      chain_id: "56",
      supported_protocol: protocol,
      limit: "100",
      offset: String(page * 100),
      sort_by: "total_score",
      sort_order: "desc",
    });
    if (!rows.length) {
      misses += 1;
      if (misses >= 2) break;
      continue;
    }
    misses = 0;
    for (const a of rows) out.push(asScanAgent(a));
    if (rows.length < 50) break;
  }
  return out;
}

async function scanSearches() {
  const queries = [
    "yield",
    "grid",
    "rebalance",
    "health factor",
    "venus",
    "pancake",
    "lending",
    "liquidity",
    "staking",
    "vault",
  ];
  const batches = await Promise.all(
    queries.map((q) =>
      scanGet({
        chain_id: "56",
        supported_protocol: "A2A",
        limit: "100",
        search: q,
        sort_by: "total_score",
        sort_order: "desc",
      }),
    ),
  );
  const out = [];
  for (const b of batches) {
    for (const a of b.rows) out.push(asScanAgent(a));
  }
  return out;
}

async function brainFind() {
  const cats = [
    "rebalancing",
    "grid-trading",
    "yield-optimization",
    "health-factor",
  ];
  const batches = await Promise.all(
    cats.map((c) => getJson(`${BRAIN}?category=${encodeURIComponent(c)}`, 8000)),
  );
  const out = [];
  for (let i = 0; i < cats.length; i++) {
    const rows = batches[i].data?.results || [];
    for (const hit of rows) {
      out.push({
        token_id: String(hit.id ?? ""),
        name: hit.name || `Agent #${hit.id}`,
        description: hit.description || "",
        endpoints: hit.endpoints,
        agent_card: hit.agent_card,
        census_category: cats[i] === "yield-optimization" ? "yield" : cats[i],
      });
    }
  }
  return out;
}

async function pool(items, n, fn) {
  const ret = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return ret;
}

const { registered, rows: censusRows } = await censusPages();
console.log("census-alive", censusRows.length, "registered", registered);

const [a2aScan, mcpScan, scanHits, brain] = await Promise.all([
  scanProtocol("A2A", SCAN_KEY ? 20 : 4),
  scanProtocol("MCP", SCAN_KEY ? 8 : 2),
  scanSearches(),
  brainFind(),
]);
console.log(
  "scan A2A",
  a2aScan.length,
  "MCP",
  mcpScan.length,
  "search",
  scanHits.length,
  "brain",
  brain.length,
);

const byId = new Map();
for (const row of [...censusRows, ...a2aScan, ...mcpScan, ...scanHits, ...brain]) {
  const id = String(row.token_id || "");
  if (!/^\d+$/.test(id)) continue;
  const prev = byId.get(id) || {};
  byId.set(id, { ...prev, ...row, token_id: id });
}
const candidates = [...byId.values()].filter(
  (a) => !leak(a.name, a.description) && !isClone(a.name, a.description),
);
console.log("unique candidates", candidates.length);

const urlCache = new Map();
async function probeCached(url) {
  if (urlCache.has(url)) return urlCache.get(url);
  const p = probe(url);
  urlCache.set(url, p);
  const r = await p;
  urlCache.set(url, r);
  return r;
}

let done = 0;
const hireable = [];
await pool(candidates, 10, async (agent) => {
  const urls = pickUrls(agent);
  done += 1;
  if (done % 40 === 0) {
    console.log("probed", done, "/", candidates.length, "hireable", hireable.length);
  }
  for (const url of urls) {
    const r = await probeCached(url);
    if (!r.ok) continue;
    const cat = categorize(agent.name, agent.description, agent.census_category);
    hireable.push({
      tokenId: agent.token_id,
      chainId: 56,
      name: (agent.name || "").trim() || `Agent #${agent.token_id}`,
      description: (agent.description || "").trim() || "Probed live A2A/MCP on BSC.",
      categoryId: cat,
      a2a: url,
      probe: r.kind,
      latencyMs: r.ms,
      owner: agent.owner || undefined,
    });
    return;
  }
});

const seen = new Set();
const unique = [];
for (const row of hireable) {
  if (seen.has(row.tokenId)) continue;
  if (row.probe === "mcp") continue;
  if (isClone(row.name, row.description)) continue;
  if (/clipx\.app/i.test(row.a2a || "")) continue;
  seen.add(row.tokenId);
  unique.push(row);
}

const byCategory = {
  rebalancing: 0,
  "grid-trading": 0,
  "yield-optimisation": 0,
  "health-factor": 0,
};
let uncategorized = 0;
for (const r of unique) {
  if (r.categoryId && byCategory[r.categoryId] != null) byCategory[r.categoryId] += 1;
  else uncategorized += 1;
}

const file = {
  asOf: new Date().toISOString(),
  registered,
  candidates: candidates.length,
  probedEndpoints: urlCache.size,
  hireable: unique,
  byCategory,
  uncategorized,
  source:
    "census-alive + 8004scan supported_protocol=A2A + brain/find, live A2A probe",
};

writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      wrote: "config/hireable-bsc.json",
      hireable: unique.length,
      byCategory,
      uncategorized,
      probedEndpoints: urlCache.size,
    },
    null,
    2,
  ),
);
