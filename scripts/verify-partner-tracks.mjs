/**
 * Local partner-track audit.
 *   node scripts/verify-partner-tracks.mjs
 */
const SITE = process.env.GENESIS_LOCAL_SITE?.trim() || "http://127.0.0.1:3000";
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${SITE}${path}`, { redirect: "follow" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, text, json, url: res.url };
}

const pages = [
  "/partners",
  "/advantage",
  "/altana",
  "/termix",
  "/judge",
  "/browse",
  "/hire",
];
for (const p of pages) {
  const r = await get(p);
  const err = /Failed to compile|Application error/i.test(r.text);
  check(`GET ${p}`, r.status === 200 && !err, `http ${r.status} → ${r.url}`);
}

const hire = await fetch(`${SITE}/hire`, { redirect: "manual" });
check(
  "/hire redirects to /browse",
  hire.status === 307 && (hire.headers.get("location") || "").includes("/browse"),
  `${hire.status} ${hire.headers.get("location")}`,
);

const partnersHtml = await get("/partners");
check(
  "partners page links Browse",
  /Browse/.test(partnersHtml.text),
);
check("partners has 8004scan", partnersHtml.text.includes("8004scan"));
check("partners has Altana", partnersHtml.text.includes("Altana"));
check("partners has TermiX", partnersHtml.text.includes("TermiX"));
check("partners has PancakeSwap", partnersHtml.text.includes("PancakeSwap"));

const status = await get("/api/partners/status");
const list = status.json?.partners || status.json?.data?.partners || [];
const byId = Object.fromEntries(list.map((p) => [p.id, p]));
check("partners status API ok", status.status === 200 && list.length >= 5, `n=${list.length}`);
for (const id of ["8004scan", "altana", "termix", "pancakeswap", "featured-a2a"]) {
  const p = byId[id];
  check(`${id} probe present`, Boolean(p), p ? `${p.mode} ${p.ok}` : "missing");
}

const jobs = [
  "job_mtphh1fs_hvnpd7",
  "job_mtphh262_191700",
  "job_mtphh2ss_6dken9",
  "job_mtphh38g_l69uoy",
];
for (const id of jobs) {
  const r = await get(`/jobs/${id}`);
  check(`advantage receipt ${id}`, r.status === 200, `http ${r.status}`);
}

const altana = await get("/altana");
check(
  "altana is not the hire path",
  /not the hire path/i.test(altana.text),
);
check(
  "altana shows mainnet proof or honest mode",
  altana.text.includes("0x5699a3d1") ||
    altana.text.includes("live") ||
    altana.text.includes("demo"),
);

const adv = await get("/advantage");
check(
  "advantage has four category tasks",
  ["lp-rebalance", "grid-book", "hf-shock", "usdt-yield"].every((id) =>
    adv.text.includes(id),
  ),
);
check("advantage does not invent PnL", !/APY \d{2}%/.test(adv.text));

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
