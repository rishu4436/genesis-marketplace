import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[line.slice(0, i).trim()] = v;
}

const url = (process.env.KV_REST_API_URL || "").replace(/\/$/, "");
const tok = process.env.KV_REST_API_TOKEN || "";
let host = "none";
try {
  host = new URL(url).host;
} catch {
  host = "bad_url";
}

const hostOk = host.includes("upstash");
console.log(
  `has_url=${Boolean(url)} host_ok=${hostOk} token_len=${tok.length}`,
);

if (!url || !tok) process.exit(1);

const hdr = {
  Authorization: `Bearer ${tok}`,
  "Content-Type": "application/json",
};

const set = await fetch(url, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify(["SET", "genesis:kv-check", "ok"]),
});
const setBody = await set.text();
let setResult = null;
try {
  setResult = JSON.parse(setBody).result;
} catch {
  /* ignore */
}
console.log(
  `set_status=${set.status} body_len=${setBody.length} result=${String(setResult)}`,
);

const get = await fetch(url, {
  method: "POST",
  headers: hdr,
  body: JSON.stringify(["GET", "genesis:kv-check"]),
});
const getJson = await get.json().catch(() => ({}));
console.log(`get_status=${get.status} ping_ok=${getJson.result === "ok"}`);
if (getJson.result !== "ok") process.exit(1);
