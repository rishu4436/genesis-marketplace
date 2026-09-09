/**
 * Live BSC mainnet ERC-8183 submit: RangeKeeper operator is the provider.
 * Buyer who funded cannot submit. $U stays in the kernel.
 *
 * Unlocks studio/RangeKeeper/.studio keystore via WALLET_PASSWORD.
 * Never prints the password or private key.
 *
 *   node scripts/submit-escrow-mainnet.mjs <marketplaceJobId>
 */
import { createDecipheriv, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const root = resolve(import.meta.dirname, "..");
const PROVIDER = "0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133";
const COMMERCE = "0xEa4DAa3100A767e86FDed867729ae7446476EBA6";
const U_TOKEN = "0xcE24439F2D9C6a2289F741120FE202248B666666";
const SITE = "https://genesis-marketplace-one.vercel.app";
const MIN_PROVIDER_BNB = 300000000000000n; // 0.0003 BNB

const SUBMIT_ABI = [
  {
    name: "submit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverable", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
];
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];
const GET_JOB_ABI = [
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
const STATUS = ["OPEN", "FUNDED", "SUBMITTED", "COMPLETED", "REJECTED", "EXPIRED"];

function encodeSubmitCall(jobId, deliverable, receiptUrl) {
  const optParams = receiptUrl
    ? stringToHex(JSON.stringify({ deliverable_url: receiptUrl }))
    : "0x";
  return {
    to: COMMERCE,
    data: encodeFunctionData({
      abi: SUBMIT_ABI,
      functionName: "submit",
      args: [jobId, deliverable, optParams],
    }),
    optParams,
  };
}

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, "studio/RangeKeeper/.studio/.env.local"));

function decryptV3Keystore(json, password) {
  const c = json.crypto;
  if (!c || c.kdf !== "scrypt" || c.cipher !== "aes-128-ctr") {
    throw new Error("unsupported keystore format");
  }
  const derived = scryptSync(
    password,
    Buffer.from(c.kdfparams.salt, "hex"),
    c.kdfparams.dklen,
    {
      N: c.kdfparams.n,
      r: c.kdfparams.r,
      p: c.kdfparams.p,
      maxmem: 512 * 1024 * 1024,
    },
  );
  const ciphertext = Buffer.from(c.ciphertext, "hex");
  const mac = keccak256(Buffer.concat([derived.subarray(16, 32), ciphertext]))
    .slice(2)
    .toLowerCase();
  if (mac !== String(c.mac).toLowerCase()) {
    throw new Error("keystore password mismatch");
  }
  const decipher = createDecipheriv(
    "aes-128-ctr",
    derived.subarray(0, 16),
    Buffer.from(c.cipherparams.iv, "hex"),
  );
  const priv = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return /** @type {`0x${string}`} */ (`0x${priv.toString("hex")}`);
}

const marketplaceJobId = (process.argv[2] || "").trim();
if (!marketplaceJobId) {
  console.error("usage: node scripts/submit-escrow-mainnet.mjs <marketplaceJobId>");
  process.exit(1);
}

const password = (process.env.WALLET_PASSWORD || "").trim();
if (!password) {
  console.error("FAIL  WALLET_PASSWORD missing in studio/RangeKeeper/.studio/.env.local");
  process.exit(1);
}

const keystorePath = resolve(
  root,
  "studio/RangeKeeper/.studio/wallets",
  `${PROVIDER}.json`,
);
if (!existsSync(keystorePath)) {
  console.error("FAIL  RangeKeeper keystore not found");
  process.exit(1);
}

const account = privateKeyToAccount(
  decryptV3Keystore(JSON.parse(readFileSync(keystorePath, "utf8")), password),
);
if (account.address.toLowerCase() !== PROVIDER.toLowerCase()) {
  console.error(`FAIL  unlocked ${account.address}, expected ${PROVIDER}`);
  process.exit(1);
}

const rpc = process.env.BSC_RPC_URL?.trim() || "https://bsc-dataseed.binance.org";
const publicClient = createPublicClient({ chain: bsc, transport: http(rpc) });
const walletClient = createWalletClient({
  account,
  chain: bsc,
  transport: http(rpc),
});

const jobRes = await fetch(`${SITE}/api/jobs/${encodeURIComponent(marketplaceJobId)}`);
const jobJson = await jobRes.json().catch(() => ({}));
const job = jobJson.data || jobJson;
const onchainJobId = String(job.escrow?.onchainJobId || "");
const outputHash = String(job.receipt?.outputHash || "").replace(/^0x/i, "");
if (!onchainJobId) {
  console.error("FAIL  receipt has no onchainJobId");
  process.exit(2);
}
if (!/^[a-fA-F0-9]{64}$/.test(outputHash)) {
  console.error("FAIL  receipt has no output hash to submit");
  process.exit(2);
}
const deliverable = /** @type {`0x${string}`} */ (`0x${outputHash}`);
const receiptUrl = `${SITE}/jobs/${encodeURIComponent(marketplaceJobId)}`;
const onchainId = BigInt(onchainJobId);

let encodedFromApi = false;
let call = null;
const prepRes = await fetch(`${SITE}/api/escrow/submit`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jobId: marketplaceJobId }),
});
const prep = await prepRes.json().catch(() => ({}));
if (prepRes.ok && prep.success === true && prep.data?.alreadySubmitted) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        alreadySubmitted: true,
        onchainJobId,
        chain: prep.data.chain,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (prepRes.ok && prep.success === true && prep.data?.call?.to && prep.data?.call?.data) {
  encodedFromApi = true;
  call = prep.data.call;
} else {
  call = encodeSubmitCall(onchainId, deliverable, receiptUrl);
}

const [bnb, sellerU] = await Promise.all([
  publicClient.getBalance({ address: PROVIDER }),
  publicClient.readContract({
    address: U_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [PROVIDER],
  }),
]);

console.log(
  JSON.stringify(
    {
      marketplaceJobId,
      onchainJobId,
      provider: PROVIDER,
      deliverable,
      receiptUrl,
      encodedFromApi,
      providerBnb: formatEther(bnb),
      sellerU: formatEther(sellerU),
    },
    null,
    2,
  ),
);

if (bnb < MIN_PROVIDER_BNB) {
  console.error(
    `FAIL  operator has ${formatEther(bnb)} BNB, need ≥ 0.0003 for gas. $U is not required.`,
  );
  process.exit(2);
}

async function callOk(data) {
  try {
    await publicClient.call({ account: PROVIDER, to: COMMERCE, data });
    return true;
  } catch {
    return false;
  }
}

if (!(await callOk(call.data))) {
  const fallback = encodeSubmitCall(onchainId, deliverable, "");
  if (await callOk(fallback.data)) {
    console.log("receipt-url optParams reverted; using empty optParams");
    call = fallback;
  } else {
    console.error("FAIL  eth_call revert — not broadcasting");
    process.exit(3);
  }
}

console.log("… Submit plan hash on-chain (provider)");
const hash = await walletClient.sendTransaction({
  to: call.to,
  data: call.data,
});
console.log(`  tx ${hash}`);
const rec = await publicClient.waitForTransactionReceipt({
  hash,
  timeout: 120_000,
});
if (rec.status !== "success") {
  console.error(`FAIL  submit reverted ${hash}`);
  process.exit(4);
}
console.log(`  ok block ${rec.blockNumber}  https://bscscan.com/tx/${hash}`);

const chainJob = await publicClient.readContract({
  address: COMMERCE,
  abi: GET_JOB_ABI,
  functionName: "getJob",
  args: [onchainId],
});
const chainStatus = STATUS[Number(chainJob.status)] || "UNKNOWN";
let persistHttp = 0;
let persistError = null;
try {
  const recordRes = await fetch(`${SITE}/api/escrow/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: marketplaceJobId, txHash: hash }),
  });
  persistHttp = recordRes.status;
  const record = await recordRes.json().catch(() => ({}));
  persistError = record.error || (recordRes.ok ? null : `http ${recordRes.status}`);
} catch (e) {
  persistError = e instanceof Error ? e.message : "persist fetch failed";
}
const sellerAfter = await publicClient.readContract({
  address: U_TOKEN,
  abi: ERC20_ABI,
  functionName: "balanceOf",
  args: [PROVIDER],
});

const out = {
  ok: chainStatus === "SUBMITTED" || chainStatus === "COMPLETED",
  marketplaceJobId,
  onchainJobId,
  submitTx: hash,
  submitTxUrl: `https://bscscan.com/tx/${hash}`,
  chainStatus,
  submittedAt: Number(chainJob.submittedAt),
  onchainDeliverable: chainJob.deliverable,
  sellerUAfter: formatEther(sellerAfter),
  persistHttp,
  persistError,
};
console.log(JSON.stringify(out, null, 2));
if (sellerAfter > 0n) {
  console.error("FAIL  seller $U moved — kernel should still hold the lock.");
  process.exit(5);
}
if (!out.ok) process.exit(6);
