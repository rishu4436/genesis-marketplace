/**
 * Local desk audit: pages, mainnet-only escrow, quote rails, escrow status.
 *   node scripts/verify-local-desk.mjs
 */
const SITE = process.env.GENESIS_LOCAL_SITE?.trim() || "http://127.0.0.1:3000";

const PAGES = [
  "/",
  "/hire",
  "/judge",
  "/genesis/range-keeper",
  "/browse",
  "/advantage",
  "/roadmap",
  "/partners",
  "/why",
  "/categories",
];

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${SITE}${path}`, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, url: res.url };
}

async function post(path, body) {
  const res = await fetch(`${SITE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function networkFromSearch(search) {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const network = (q.get("network") || "").trim().toLowerCase();
  const chain = (q.get("chain") || "").trim().toLowerCase();
  if (
    network === "testnet" ||
    network === "demo" ||
    chain === "97" ||
    network === "mainnet" ||
    chain === "56"
  ) {
    return "mainnet";
  }
  return null;
}

check(
  "escrow=1 is not a network pick",
  networkFromSearch("?escrow=1") === null,
);
check(
  "network=testnet coerces to mainnet",
  networkFromSearch("?network=testnet&escrow=1") === "mainnet",
);
check(
  "chain=56 selects mainnet",
  networkFromSearch("?chain=56") === "mainnet",
);

for (const path of PAGES) {
  try {
    const { status, text } = await get(path);
    const compile = /Failed to compile|Application error|Unhandled Runtime/i.test(text);
    check(`GET ${path}`, status === 200 && !compile, `http ${status}`);
  } catch (e) {
    check(`GET ${path}`, false, e instanceof Error ? e.message : String(e));
  }
}

const demo = await get("/demo");
check(
  "GET /demo redirects to /judge",
  demo.status === 200 && /90-second path|Judge/i.test(demo.text),
);

const judge = await get("/judge");
check("judge names mainnet 56754", judge.text.includes("56754"));
check("judge does not name testnet 1165", !judge.text.includes("1165"));
check("judge has no Demo hire CTA", !/Demo hire · chain 97/i.test(judge.text));
check("judge has no network=testnet", !judge.text.includes("network=testnet"));
check("judge says SUBMITTED, not settled", judge.text.includes("SUBMITTED, not settled"));
check(
  "judge mainnet fund uses bscscan.com",
  judge.text.includes("bscscan.com/tx/0x665ac9334b89bd9b9a9b09b08795cb6a6f97711b8acb1c3fefdb64d1a200fb97") &&
    !judge.text.includes("testnet.bscscan.com/tx/0x665ac933"),
);
check("judge Get plan CTA has no buy=1", judge.text.includes("Judge mode · Get plan") && !/range-keeper[^"]*buy=1/.test(judge.text));
check(
  "judge 8004scan uses /agents/bsc/",
  judge.text.includes("8004scan.io/agents/bsc/336622") &&
    !judge.text.includes("8004scan.io/agents/56/336622"),
);
check("judge does not say escrow is not live", !/Escrow is not live/i.test(judge.text));
check(
  "home has no mainnet/testnet chooser",
  !(await get("/")).text.includes("Mainnet escrow or testnet demo"),
);

const mainQ = await post("/api/escrow/quote", {
  genesisSlug: "range-keeper",
  task: "Rebalance my PCS V3 BNB/USDT LP when out of range.",
  escrowChainId: 56,
});
const testQ = await post("/api/escrow/quote", {
  genesisSlug: "range-keeper",
  task: "Rebalance my PCS V3 BNB/USDT LP when out of range.",
  escrowChainId: 97,
});
check("quote mainnet 56", mainQ.json?.success === true && mainQ.json.data?.chainId === 56);
check(
  "quote testnet 97 rejected",
  testQ.status === 400 && testQ.json?.success === false,
  testQ.json?.error,
);
check(
  "mainnet quote window is 7d",
  mainQ.json?.data?.disputeWindowSeconds === 604800,
);

const drip = await post("/api/escrow/testnet-topup", {
  wallet: "0xd951d3264ab6aA83f4eAD247e35F96F140304b93",
});
check("testnet drip closed", drip.status === 410 && drip.json?.success === false);

const stMain = await fetch(
  `${SITE}/api/escrow/status?onchainJobId=56754&chainId=56`,
).then((r) => r.json());
check(
  "mainnet 56754 still SUBMITTED",
  stMain.success === true && stMain.data?.chain?.statusName === "SUBMITTED",
  stMain.data?.chain?.statusName,
);
check(
  "mainnet 56754 cannot approve yet",
  stMain.data?.canApprove === false,
);

const settleEarly = await post("/api/escrow/settle", {
  jobId: "job_mttldo5y_1x953q",
  action: "approve",
});
check(
  "mainnet approve still blocked",
  settleEarly.status === 400 || settleEarly.json?.success === false,
  settleEarly.json?.error,
);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
