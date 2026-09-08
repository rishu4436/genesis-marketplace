/**
 * Live BSC mainnet Altana Keystore grant. ESM so @altananetwork/sdk loads.
 * Reads ALTANA_ADMIN_PRIVATE_KEY from .env.local. Never prints the key.
 * Never falls back to demo or testnet.
 *
 *   node scripts/grant-altana-mainnet.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, BNB, signerFromPrivateKey } from "@altananetwork/sdk";

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
  console.error(
    "FAIL  ALTANA_ADMIN_PRIVATE_KEY missing. Run node scripts/replace-altana-wallet.mjs first.",
  );
  process.exit(1);
}
const hex = k.startsWith("0x") ? k : `0x${k}`;

const admin = signerFromPrivateKey(hex);
const client = createClient({ chains: [BNB] });
const wallet = await client.createWallet({ signer: admin });

const rpc = "https://bsc-dataseed.binance.org";
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
const need = 20_000_000_000_000_000n; // 0.02 BNB min; ~0.05 recommended
console.log(
  JSON.stringify({
    network: "bnb",
    chainId: 56,
    admin: admin.address,
    wallet: wallet.address,
    bnb: Number(bal) / 1e18,
    keystore: BNB.keyStore,
  }),
);

if (bal < need) {
  console.error(
    `FAIL  ${wallet.address} has ${Number(bal) / 1e18} BNB on BSC mainnet. Send ~0.05 BNB, then re-run.`,
  );
  console.error("bscscan https://bscscan.com/address/" + wallet.address);
  console.error("altana  https://explorer.altana.network/account/" + wallet.address);
  process.exit(2);
}

const expiry = Math.floor(Date.now() / 1000) + 720 * 3600;
const session = await client.grantSession({
  wallet,
  signer: admin,
  permissions: {
    calls: [
      { to: "0x1b81D678ffb9C0263b24A97847620C99d213eB14" },
      { to: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364" },
    ],
    spend: [{ limit: 20_000_000_000_000_000n, period: "day" }],
  },
  expiry,
  register: true,
  chainId: 56,
});

const tx = session.transactionHash;
if (!tx) {
  console.error(
    "FAIL  grantSession returned no transactionHash (not a live mainnet Keystore write).",
  );
  process.exit(1);
}

const sessionPk =
  session?.signer?._privateKey ||
  session?.signer?.privateKey ||
  session?.privateKey ||
  null;

let revokeTx = null;
if (sessionPk) {
  try {
    const sessionSigner = signerFromPrivateKey(
      sessionPk.startsWith("0x") ? sessionPk : `0x${sessionPk}`,
    );
    const revoked = await client.revokeSession({
      wallet,
      signer: admin,
      session: {
        walletAddress: session.walletAddress || wallet.address,
        publicKey: session.publicKey,
        permissions: session.permissions,
        expiry: session.expiry || expiry,
        signer: sessionSigner,
      },
    });
    revokeTx =
      revoked?.transactionHash ||
      revoked?.hash ||
      revoked?.txHash ||
      null;
  } catch (e) {
    console.error(
      "WARN  on-chain revoke failed (grant still counts):",
      e instanceof Error ? e.message : e,
    );
  }
} else {
  console.error(
    "WARN  grant returned no session private key — local revoke only.",
  );
}

const proof = {
  network: "bnb",
  chainId: 56,
  walletAddress: session.walletAddress || wallet.address,
  adminAddress: admin.address,
  keystore: BNB.keyStore,
  transactionHash: tx,
  revokeTransactionHash: revokeTx || undefined,
  explorerUrl: `https://bscscan.com/tx/${tx}`,
  keystoreExplorer: `https://bscscan.com/address/${BNB.keyStore}`,
  agentSlug: "range-keeper",
  agentName: "RangeKeeper",
  grantedAt: new Date().toISOString(),
  sessionId: `alt_${Date.now().toString(36)}`,
};

writeFileSync(
  resolve(root, "config", "altana-proof.json"),
  JSON.stringify(proof, null, 2) + "\n",
);

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
      revokeTransactionHash: revokeTx || undefined,
      status: revokeTx ? "revoked" : "active",
      revokedAt: revokeTx ? new Date().toISOString() : undefined,
      mode: "live",
      network: "bnb",
      chainId: 56,
      createdAt: proof.grantedAt,
      adminAddress: admin.address,
      keystore: BNB.keyStore,
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
      status: revokeTx ? "revoked" : "active",
      wallet: proof.walletAddress,
      tx,
      revokeTx,
      explore: proof.explorerUrl,
      revokeExplore: revokeTx ? `https://bscscan.com/tx/${revokeTx}` : null,
      altana: `https://explorer.altana.network/account/${proof.walletAddress}`,
      proof: "config/altana-proof.json",
    },
    null,
    2,
  ),
);
