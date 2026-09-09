/**
 * Live BSC mainnet ERC-8183 fund: Altana admin EOA as BUYER, RangeKeeper as
 * counterparty. $U locks in the commerce kernel — never transferred to the
 * seller EOA. Reads ALTANA_ADMIN_PRIVATE_KEY from .env.local. Never prints it.
 *
 *   node scripts/fund-escrow-mainnet.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatEther,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const root = resolve(import.meta.dirname, "..");

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

const BUYER = "0xd951d3264ab6aA83f4eAD247e35F96F140304b93";
const PROVIDER = "0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133";
const COMMERCE = "0xEa4DAa3100A767e86FDed867729ae7446476EBA6";
const ROUTER = "0x51895229E12F9876011789B04f8698af06cCD6DA";
const POLICY = "0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5";
const U_TOKEN = "0xcE24439F2D9C6a2289F741120FE202248B666666";
const BUDGET = parseEther("0.08");
const MIN_BNB = parseEther("0.007");
/** Must cover OptimisticPolicy disputeWindow (7d). 1800s made 56748 un-submittable. */
const DEADLINE_SECONDS = 7n * 24n * 3600n;
const TASK =
  "Rebalance my PCS V3 BNB/USDT LP when out of range. Propose new bands, fee APR vs IL, and whether to reset now. Plan only — I keep the keys.";
const SITE = "https://genesis-marketplace-one.vercel.app";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const COMMERCE_ABI = [
  {
    name: "createJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "setBudget",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "fund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "expectedBudget", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "getJob",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "provider", type: "address" },
          { name: "evaluator", type: "address" },
          { name: "description", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "expiredAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "hook", type: "address" },
          { name: "submittedAt", type: "uint256" },
          { name: "deliverable", type: "bytes32" },
        ],
      },
    ],
  },
];

const ROUTER_ABI = [
  {
    name: "registerJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "policy", type: "address" },
    ],
    outputs: [],
  },
];

const POLICY_ABI = [
  {
    name: "disputeWindow",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
];

const JOB_CREATED_EVENT = {
  type: "event",
  name: "JobCreated",
  inputs: [
    { name: "jobId", type: "uint256", indexed: true },
    { name: "client", type: "address", indexed: true },
    { name: "provider", type: "address", indexed: true },
    { name: "evaluator", type: "address", indexed: false },
    { name: "expiredAt", type: "uint256", indexed: false },
    { name: "hook", type: "address", indexed: false },
  ],
};

const STATUS = ["OPEN", "FUNDED", "SUBMITTED", "COMPLETED", "REJECTED", "EXPIRED"];

const k = (process.env.ALTANA_ADMIN_PRIVATE_KEY || "").trim();
if (!k) {
  console.error("FAIL  ALTANA_ADMIN_PRIVATE_KEY missing.");
  process.exit(1);
}
const hex = /** @type {`0x${string}`} */ (k.startsWith("0x") ? k : `0x${k}`);
const account = privateKeyToAccount(hex);
if (account.address.toLowerCase() !== BUYER.toLowerCase()) {
  console.error(
    `FAIL  key address ${account.address} is not the funded Altana buyer ${BUYER}`,
  );
  process.exit(1);
}

const rpc = process.env.BSC_RPC_URL?.trim() || "https://bsc-dataseed.binance.org";
const publicClient = createPublicClient({ chain: bsc, transport: http(rpc) });
const walletClient = createWalletClient({
  account,
  chain: bsc,
  transport: http(rpc),
});

function txUrl(hash) {
  return `https://bscscan.com/tx/${hash}`;
}

async function send(label, request) {
  console.log(`… ${label}`);
  const hash = await walletClient.writeContract(request);
  console.log(`  tx ${hash}`);
  const rec = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 120_000,
  });
  if (rec.status !== "success") {
    throw new Error(`${label} reverted ${hash}`);
  }
  console.log(`  ok block ${rec.blockNumber}  ${txUrl(hash)}`);
  return { hash, rec };
}

const [bnb, buyerU, sellerU, kernelU, allowance, window] = await Promise.all([
  publicClient.getBalance({ address: BUYER }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [BUYER],
  }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [PROVIDER],
  }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [COMMERCE],
  }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [BUYER, COMMERCE],
  }),
  publicClient.readContract({
    address: POLICY,
    abi: POLICY_ABI,
    functionName: "disputeWindow",
  }),
]);

console.log(
  JSON.stringify(
    {
      chainId: 56,
      buyer: BUYER,
      provider: PROVIDER,
      kernel: COMMERCE,
      budgetU: "0.08",
      buyerU: formatEther(buyerU),
      sellerU: formatEther(sellerU),
      kernelU: formatEther(kernelU),
      bnb: formatEther(bnb),
      disputeWindowSec: Number(window),
    },
    null,
    2,
  ),
);

if (buyerU < BUDGET) {
  console.error(`FAIL  buyer has ${formatEther(buyerU)} U, need 0.08`);
  process.exit(2);
}
if (bnb < MIN_BNB) {
  console.error(`FAIL  buyer has ${formatEther(bnb)} BNB, need ≥ 0.007`);
  process.exit(2);
}

let approveTx;
if (allowance < BUDGET) {
  const sent = await send("Approve $U to kernel (not seller)", {
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [COMMERCE, BUDGET],
  });
  approveTx = sent.hash;
} else {
  console.log("allowance already covers 0.08 U");
}

const expiredAt =
  BigInt(Math.floor(Date.now() / 1000)) + BigInt(window) + DEADLINE_SECONDS;
const nowSec = BigInt(Math.floor(Date.now() / 1000));
if (expiredAt < nowSec + BigInt(window) + 24n * 3600n) {
  console.error(
    "FAIL  expiredAt would not leave a 7d submit window — refusing to fund another un-submittable lock.",
  );
  process.exit(2);
}
console.log(
  JSON.stringify(
    {
      expiredAt: expiredAt.toString(),
      expiredISO: new Date(Number(expiredAt) * 1000).toISOString(),
      deadlineSeconds: Number(DEADLINE_SECONDS),
      submitWindowOkAtFund: true,
    },
    null,
    2,
  ),
);

const created = await send("Create escrow job", {
  address: COMMERCE,
  abi: COMMERCE_ABI,
  functionName: "createJob",
  args: [PROVIDER, ROUTER, expiredAt, TASK, ROUTER],
});

let jobId = 0n;
for (const log of created.rec.logs) {
  if (log.address.toLowerCase() !== COMMERCE.toLowerCase()) continue;
  try {
    const decoded = decodeEventLog({
      abi: [JOB_CREATED_EVENT],
      data: log.data,
      topics: log.topics,
    });
    if (decoded.eventName === "JobCreated" && decoded.args.jobId != null) {
      jobId = decoded.args.jobId;
      break;
    }
  } catch {
    /* next */
  }
}
if (jobId <= 0n) {
  console.error("FAIL  could not decode JobCreated jobId");
  process.exit(3);
}
console.log(`on-chain job ${jobId.toString()}`);

try {
  await publicClient.simulateContract({
    account,
    address: ROUTER,
    abi: ROUTER_ABI,
    functionName: "registerJob",
    args: [jobId, POLICY],
  });
} catch (e) {
  console.error(
    "FAIL  registerJob would revert — stopping before setBudget/fund so $U stays in the buyer wallet.",
  );
  console.error(e instanceof Error ? e.message : String(e));
  console.error(`OPEN job ${jobId.toString()}  create ${txUrl(created.hash)}`);
  process.exit(4);
}

const registered = await send("Register policy", {
  address: ROUTER,
  abi: ROUTER_ABI,
  functionName: "registerJob",
  args: [jobId, POLICY],
});

const budgeted = await send("Set budget 0.08 U", {
  address: COMMERCE,
  abi: COMMERCE_ABI,
  functionName: "setBudget",
  args: [jobId, BUDGET, "0x"],
});

const funded = await send("Fund escrow (lock $U in kernel)", {
  address: COMMERCE,
  abi: COMMERCE_ABI,
  functionName: "fund",
  args: [jobId, BUDGET, "0x"],
});

const [chainJob, buyerAfter, sellerAfter, kernelAfter] = await Promise.all([
  publicClient.readContract({
    address: COMMERCE,
    abi: COMMERCE_ABI,
    functionName: "getJob",
    args: [jobId],
  }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [BUYER],
  }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [PROVIDER],
  }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [COMMERCE],
  }),
]);

const statusName = STATUS[Number(chainJob.status)] || "UNKNOWN";
const sellerDelta = sellerAfter - sellerU;
if (sellerDelta > 0n) {
  console.error(
    `FAIL  seller $U increased by ${formatEther(sellerDelta)} — aborting persist. Kernel lock only.`,
  );
  process.exit(5);
}
if (chainJob.client.toLowerCase() !== BUYER.toLowerCase()) {
  console.error("FAIL  on-chain client is not the Altana buyer");
  process.exit(5);
}
if (chainJob.provider.toLowerCase() !== PROVIDER.toLowerCase()) {
  console.error("FAIL  on-chain provider is not RangeKeeper");
  process.exit(5);
}
if (statusName !== "FUNDED") {
  console.error(`FAIL  on-chain status ${statusName}, expected FUNDED`);
  process.exit(5);
}

const persistBody = {
  genesisSlug: "range-keeper",
  chainId: 56,
  tokenId: "336622",
  agentName: "RangeKeeper",
  categoryId: "rebalancing",
  task: TASK,
  wallet: BUYER,
  onchainJobId: jobId.toString(),
  fundTx: funded.hash,
  createTx: created.hash,
  approveTx,
  budgetUsd: "0.08",
};

const persistRes = await fetch(`${SITE}/api/escrow/fund`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(persistBody),
});
const persistJson = await persistRes.json().catch(() => ({}));

const out = {
  ok: persistRes.ok && persistJson.success === true,
  onchainJobId: jobId.toString(),
  status: statusName,
  buyer: BUYER,
  provider: PROVIDER,
  kernel: COMMERCE,
  budgetU: "0.08",
  buyerUAfter: formatEther(buyerAfter),
  sellerUAfter: formatEther(sellerAfter),
  kernelUAfter: formatEther(kernelAfter),
  approveTx: approveTx || null,
  createTx: created.hash,
  registerTx: registered.hash,
  setBudgetTx: budgeted.hash,
  fundTx: funded.hash,
  fundTxUrl: txUrl(funded.hash),
  sharePath: persistJson.sharePath || null,
  marketplaceJobId: persistJson.data?.id || null,
  persistError: persistJson.error || null,
};
console.log(JSON.stringify(out, null, 2));
if (!out.ok) {
  console.error(
    "On-chain fund succeeded; marketplace receipt persist failed. Hashes above are still real.",
  );
  process.exit(6);
}
