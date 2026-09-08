/**
 * Live BSC testnet Altana Keystore grant. ESM so @altananetwork/sdk loads.
 * Reads ALTANA_ADMIN_PRIVATE_KEY from .env.local. Never prints the key.
 *
 *   node scripts/grant-altana-testnet.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  createClient,
  BNB_TESTNET,
  signerFromPrivateKey,
} from "@altananetwork/sdk";

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

const k = (process.env.ALTANA_ADMIN_PRIVATE_KEY || "").trim();
if (!k) {
  console.error("FAIL  ALTANA_ADMIN_PRIVATE_KEY missing. Run node scripts/replace-altana-wallet.mjs first.");
  process.exit(1);
}
const hex = (k.startsWith("0x") ? k : `0x${k}`);

const admin = signerFromPrivateKey(hex);
const client = createClient({ chains: [BNB_TESTNET] });
const wallet = await client.createWallet({ signer: admin });

const rpc = "https://bsc-testnet.bnbchain.org";
async function getBal(addr) {
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [addr, "latest"],
    }),
  });
  const j = await r.json();
  return j.result ? BigInt(j.result) : 0n;
}

const bal = await getBal(wallet.address);
const need = 20_000_000_000_000_000n; // 0.02 tBNB
console.log(
  JSON.stringify({
    network: "bnb-testnet",
    chainId: 97,
    admin: admin.address,
    wallet: wallet.address,
    tBnb: Number(bal) / 1e18,
    keystore: BNB_TESTNET.keyStore,
  }),
);

if (bal < need) {
  console.error(
    `FAIL  ${wallet.address} has ${Number(bal) / 1e18} tBNB. Fund ~0.05 tBNB then re-run.`,
  );
  console.error("Faucet: https://www.bnbchain.org/en/testnet-faucet");
  console.error("Altana: https://testnet.altana.network/account/" + wallet.address);
  process.exit(2);
}

const expiry = Math.floor(Date.now() / 1000) + 720 * 3600;
const session = await client.grantSession({
  wallet,
  signer: admin,
  permissions: {
    calls: [
      { to: "0x1b81D678ffb9C0263b24A97847620C99d213eB14" }, // PCS V3 SwapRouter
      { to: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364" }, // NonfungiblePositionManager
    ],
    spend: [
      { limit: 50_000_000_000_000_000n, period: "day" }, // 0.05 BNB gas
    ],
  },
  expiry,
  register: true,
  chainId: 97,
});

const tx = session.transactionHash;
if (!tx) {
  console.error("FAIL  grantSession returned no transactionHash (not a live Keystore write).");
  process.exit(1);
}

const proof = {
  network: "bnb-testnet",
  chainId: 97,
  walletAddress: session.walletAddress || wallet.address,
  adminAddress: admin.address,
  keystore: BNB_TESTNET.keyStore,
  transactionHash: tx,
  explorerUrl: `https://testnet.bscscan.com/tx/${tx}`,
  keystoreExplorer: `https://testnet.bscscan.com/address/${BNB_TESTNET.keyStore}`,
  agentSlug: "range-keeper",
  agentName: "RangeKeeper",
  grantedAt: new Date().toISOString(),
  sessionId: `alt_${Date.now().toString(36)}`,
};

const proofPath = resolve(root, "config", "altana-proof.json");
writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n");

const sessDir = resolve(root, "data", "altana-sessions");
mkdirSync(sessDir, { recursive: true });
writeFileSync(
  resolve(sessDir, `${proof.sessionId}.json`),
  JSON.stringify(
    {
      id: proof.sessionId,
      agentSlug: "range-keeper",
      agentName: "RangeKeeper",
      walletAddress: proof.walletAddress,
      publicKey: String(session.publicKey || ""),
      expiry,
      transactionHash: tx,
      status: "active",
      mode: "live",
      network: "bnb-testnet",
      chainId: 97,
      createdAt: proof.grantedAt,
      adminAddress: admin.address,
      keystore: BNB_TESTNET.keyStore,
      explorerUrl: proof.explorerUrl,
      policyTitle: "RangeKeeper · LP rebalance session",
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      mode: "live",
      status: "active",
      wallet: proof.walletAddress,
      tx,
      explore: proof.explorerUrl,
      altana: `https://testnet.altana.network/account/${proof.walletAddress}`,
      proof: "config/altana-proof.json",
    },
    null,
    2,
  ),
);
