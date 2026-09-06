/**
 * One-shot BSC mainnet Altana Keystore grant.
 * Writes config/altana-proof.json (commit this so /judge stays live).
 *
 *   set ALTANA_ADMIN_PRIVATE_KEY=0x...
 *   set ALTANA_NETWORK=mainnet
 *   npx --yes tsx scripts/grant-altana-mainnet.ts
 *
 * Wallet needs ~0.05 BNB on BSC mainnet for gas.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));
process.env.ALTANA_NETWORK = "mainnet";

async function main() {
  const { grantAgentSession, adminAddressFromEnv, altanaStatus } =
    await import("../src/lib/altana/client");
  const { readLiveProof } = await import("../src/lib/altana/proof");

  const status = altanaStatus();
  const admin = adminAddressFromEnv();
  if (!admin) {
    console.error("FAIL  Set ALTANA_ADMIN_PRIVATE_KEY (the EOA that owns the Altana wallet).");
    process.exit(1);
  }
  console.log("network", status.network, "chain", status.chainId);
  console.log("admin  ", admin);
  console.log("keystore", status.keystore);
  console.log("Fund this EOA with ~0.05 BNB on BSC mainnet if the grant reverts on gas.");

  const session = await grantAgentSession({
    agentSlug: "range-keeper",
    expiryHours: 720,
  });
  console.log("mode   ", session.mode);
  console.log("status ", session.status);
  console.log("wallet ", session.walletAddress);
  console.log("tx     ", session.transactionHash || "(none)");
  console.log("explore", session.explorerUrl);

  const proof = await readLiveProof();
  if (!proof?.transactionHash || proof.chainId !== 56) {
    console.error("FAIL  Proof is not a BSC mainnet tx. Grant may have demo'd or stayed on testnet.");
    process.exit(1);
  }
  console.log("");
  console.log("PASS  Commit config/altana-proof.json and push so /judge shows mainnet.");
  console.log("      Then revoke once from /altana so the judge sees both grant and revoke.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
