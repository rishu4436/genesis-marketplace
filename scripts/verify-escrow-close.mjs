/**
 * Local checks: desk escrow is BSC mainnet only.
 * Does not send $U and does not print secrets.
 */

const SITE = process.env.GENESIS_LOCAL_SITE?.trim() || "http://localhost:3000";

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${SITE}${path}`, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text };
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

const brief = "Mainnet hire close-panel check for RangeKeeper on chain 56";

const quote56 = await post("/api/escrow/quote", {
  genesisSlug: "range-keeper",
  chainId: 56,
  tokenId: "336622",
  task: brief,
  escrowChainId: 56,
});
check(
  "quote chain 56",
  quote56.status === 200 &&
    quote56.json?.success &&
    quote56.json?.data?.chainId === 56 &&
    String(quote56.json?.data?.addresses?.paymentToken || "")
      .toLowerCase()
      .startsWith("0xce2443"),
  `http ${quote56.status} chain=${quote56.json?.data?.chainId} token=${String(quote56.json?.data?.addresses?.paymentToken || "").slice(0, 10)} budget=${quote56.json?.data?.budgetU}`,
);

const quote97 = await post("/api/escrow/quote", {
  genesisSlug: "range-keeper",
  chainId: 56,
  tokenId: "336622",
  task: brief,
  escrowChainId: 97,
});
check(
  "quote chain 97 rejected",
  quote97.status === 400 && quote97.json?.success === false,
  `http ${quote97.status} ${quote97.json?.error || ""}`,
);

const badDrip = await post("/api/escrow/testnet-topup", { wallet: "not-an-address" });
check(
  "testnet drip closed",
  badDrip.status === 410 && badDrip.json?.success === false,
  `http ${badDrip.status} ${badDrip.json?.error || ""}`,
);

const pages = [
  "/genesis/range-keeper?escrow=1",
  "/genesis/range-keeper",
];
for (const path of pages) {
  const { status, text } = await get(path);
  const compile = /Failed to compile|Application error|Unhandled Runtime/i.test(text);
  check(`GET ${path}`, status === 200 && !compile, `http ${status}`);
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
