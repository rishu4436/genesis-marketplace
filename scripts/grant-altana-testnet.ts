/**
 * Thin wrapper — the SDK is ESM-only, so the real grant lives in
 * scripts/grant-altana-testnet.mjs.
 *
 *   node scripts/grant-altana-testnet.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const r = spawnSync(
  process.execPath,
  [path.join(process.cwd(), "scripts", "grant-altana-testnet.mjs")],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
