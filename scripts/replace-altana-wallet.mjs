/**
 * Replace the Altana admin EOA.
 * Writes ALTANA_ADMIN_PRIVATE_KEY to .env.local (gitignored).
 * Prints the address only — never the private key.
 *
 *   node scripts/replace-altana-wallet.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

const prev = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const lines = prev.split(/\r?\n/).filter((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) {
    if (/altana admin/i.test(t)) return false;
    return true;
  }
  const key = t.split("=")[0]?.trim();
  return key !== "ALTANA_ADMIN_PRIVATE_KEY" && key !== "ALTANA_NETWORK";
});
while (lines.length && lines[lines.length - 1] === "") lines.pop();

const stamp = new Date().toISOString().slice(0, 10);
lines.push("");
lines.push(
  `# Altana admin (generated ${stamp}) — import into MetaMask. Never commit.`,
);
lines.push(`ALTANA_ADMIN_PRIVATE_KEY=${pk}`);
lines.push("ALTANA_NETWORK=mainnet");
lines.push("");

writeFileSync(envPath, lines.join("\n"), { encoding: "utf8", mode: 0o600 });

console.log(
  JSON.stringify(
    {
      wrote: ".env.local",
      adminAddress: account.address,
      network: "mainnet",
      chainId: 56,
      note: "Private key is only in .env.local. Import that account into MetaMask now so you do not lose it again.",
    },
    null,
    2,
  ),
);
