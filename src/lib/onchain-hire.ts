/**
 * On-chain ERC-8183 buy / status / fetch / settle via `bag` CLI.
 * Buyer wallet = studio project under BUYER_PROJECT (default RangeKeeper).
 *
 * Requires funded buyer wallet: BNB (for ERC-20 approve) + mainnet payment token.
 * Many commerce writes are MegaFuel-sponsored. Default network is bsc-mainnet.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getPin } from "./pins";
import {
  a2aNotifyFunded,
  getPlatformConfig,
} from "./platform-a2a";

export type OnchainBuyResult = {
  ok: boolean;
  jobId?: number;
  provider?: string;
  budgetU?: string;
  createTx?: string;
  fundTx?: string;
  registerTx?: string;
  setBudgetTx?: string;
  negotiatedPriceU?: string;
  raw: string;
  error?: string;
};

export type OnchainStatus = {
  ok: boolean;
  fields: Record<string, string>;
  raw: string;
  error?: string;
};

function buyerProjectRoot(): string {
  const env = process.env.BUYER_PROJECT;
  if (env) return path.resolve(env);
  return path.join(process.cwd(), "studio", "RangeKeeper", "app", "agent");
}

function loadBuyerEnv(cwd: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  try {
    // bag auto-loads workspace .studio/.env.local; also inject for spawn
    const candidates = [
      path.join(cwd, "..", "..", ".studio", ".env.local"),
      path.join(cwd, ".studio", ".env.local"),
      path.join(process.cwd(), ".env.local"),
    ];
    for (const f of candidates) {
      if (!fs.existsSync(/*turbopackIgnore: true*/ f)) continue;
      const text = fs.readFileSync(/*turbopackIgnore: true*/ f, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
        if (m && !env[m[1]]) env[m[1]] = m[2].trim();
      }
    }
  } catch {
    /* ignore */
  }
  return env;
}

function runBag(
  args: string[],
  cwd: string,
  timeoutMs = 180_000,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("bag", args, {
      cwd,
      env: loadBuyerEnv(cwd),
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => {
      child.kill();
      resolve({ code: 124, stdout, stderr: stderr + "\n[timeout]" });
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function parseKv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/**
 * On-chain buy with provider address (skips HTTP negotiate — budget is explicit).
 * Prefer this for marketplace once quote is known, to avoid bag A2A OAuth issues.
 */
export async function onchainBuy(opts: {
  providerAddress: string;
  task: string;
  budgetU: number;
  deadlineMin?: number;
  network?: string;
}): Promise<OnchainBuyResult> {
  const cwd = buyerProjectRoot();
  const args = [
    "erc8183",
    "buy",
    "--provider",
    opts.providerAddress,
    "--task",
    opts.task,
    "--budget-u",
    String(opts.budgetU),
    "--deadline-min",
    String(opts.deadlineMin ?? 60),
    "--network",
    opts.network || "bsc-mainnet",
  ];
  const { code, stdout, stderr } = await runBag(args, cwd);
  const raw = `${stdout}\n${stderr}`;
  if (code !== 0) {
    return {
      ok: false,
      raw,
      error: stderr.trim() || stdout.trim() || `bag exit ${code}`,
    };
  }
  const kv = parseKv(stdout + "\n" + stderr);
  const jobId = kv.job_id ? Number(kv.job_id) : undefined;
  return {
    ok: Boolean(jobId),
    jobId,
    provider: kv.provider,
    budgetU: kv.budget_u,
    createTx: kv.create_tx,
    fundTx: kv.fund_tx,
    registerTx: kv.register_tx,
    setBudgetTx: kv.set_budget_tx,
    negotiatedPriceU: kv.negotiated_price_u,
    raw,
    error: jobId ? undefined : "job_id not parsed",
  };
}

/** Buy by ERC-8004 agent_id (negotiates A2A first — needs seller reachable + auth). */
export async function onchainBuyByAgentId(opts: {
  agentId: number | string;
  task: string;
  budgetU?: number;
  deadlineMin?: number;
  protocol?: "A2A" | "ERC8183";
  network?: string;
}): Promise<OnchainBuyResult> {
  const cwd = buyerProjectRoot();
  const args = [
    "erc8183",
    "buy",
    "--agent-id",
    String(opts.agentId),
    "--protocol",
    opts.protocol || "A2A",
    "--task",
    opts.task,
    "--deadline-min",
    String(opts.deadlineMin ?? 60),
    "--network",
    opts.network || "bsc-mainnet",
  ];
  if (opts.budgetU != null) {
    args.push("--budget-u", String(opts.budgetU));
  }
  const { code, stdout, stderr } = await runBag(args, cwd);
  const raw = `${stdout}\n${stderr}`;
  if (code !== 0) {
    return {
      ok: false,
      raw,
      error: stderr.trim() || stdout.trim() || `bag exit ${code}`,
    };
  }
  const kv = parseKv(stdout + "\n" + stderr);
  const jobId = kv.job_id ? Number(kv.job_id) : undefined;
  return {
    ok: Boolean(jobId),
    jobId,
    provider: kv.provider,
    budgetU: kv.budget_u,
    createTx: kv.create_tx,
    fundTx: kv.fund_tx,
    registerTx: kv.register_tx,
    setBudgetTx: kv.set_budget_tx,
    negotiatedPriceU: kv.negotiated_price_u,
    raw,
    error: jobId ? undefined : "job_id not parsed",
  };
}

export async function onchainStatus(
  jobId: number,
  network = "bsc-mainnet",
): Promise<OnchainStatus> {
  const cwd = buyerProjectRoot();
  const { code, stdout, stderr } = await runBag(
    ["erc8183", "status", String(jobId), "--network", network],
    cwd,
    60_000,
  );
  const raw = `${stdout}\n${stderr}`;
  if (code !== 0) {
    return { ok: false, fields: {}, raw, error: stderr || stdout };
  }
  return { ok: true, fields: parseKv(stdout + "\n" + stderr), raw };
}

export async function onchainFetch(
  jobId: number,
  network = "bsc-mainnet",
): Promise<OnchainStatus> {
  const cwd = buyerProjectRoot();
  const { code, stdout, stderr } = await runBag(
    ["erc8183", "fetch", String(jobId), "--network", network],
    cwd,
    60_000,
  );
  const raw = `${stdout}\n${stderr}`;
  if (code !== 0) {
    return { ok: false, fields: {}, raw, error: stderr || stdout };
  }
  return { ok: true, fields: parseKv(stdout + "\n" + stderr), raw };
}

export async function onchainSettle(
  jobId: number,
  action: "approve" | "dispute" | "reject" = "approve",
  network = "bsc-mainnet",
): Promise<OnchainStatus> {
  const cwd = buyerProjectRoot();
  const { code, stdout, stderr } = await runBag(
    [
      "erc8183",
      "settle",
      String(jobId),
      "--action",
      action,
      "--network",
      network,
    ],
    cwd,
    120_000,
  );
  const raw = `${stdout}\n${stderr}`;
  if (code !== 0) {
    return { ok: false, fields: {}, raw, error: stderr || stdout };
  }
  return { ok: true, fields: parseKv(stdout + "\n" + stderr), raw };
}

export async function onchainBuyAndNotify(opts: {
  genesisSlug: string;
  task: string;
  budgetU: number;
  deadlineMin?: number;
}): Promise<{
  buy: OnchainBuyResult;
  notify?: { ok: boolean; raw: unknown; error?: string };
}> {
  const pin = getPin(opts.genesisSlug);
  const provider = pin.walletAddress;
  if (!provider) {
    return {
      buy: {
        ok: false,
        raw: "",
        error: `No walletAddress in pins for ${opts.genesisSlug}`,
      },
    };
  }

  const buy = await onchainBuy({
    providerAddress: provider,
    task: opts.task,
    budgetU: opts.budgetU,
    deadlineMin: opts.deadlineMin,
  });

  if (!buy.ok || !buy.jobId) {
    return { buy };
  }

  const platform = getPlatformConfig(opts.genesisSlug);
  if (!platform) {
    return { buy };
  }

  const clientId = process.env[platform.clientIdEnv];
  const clientSecret = process.env[platform.clientSecretEnv];
  const notify = await a2aNotifyFunded({
    a2aUrl: platform.a2aUrl,
    agentId: platform.agentId,
    jobId: buy.jobId,
    clientId: clientId || undefined,
    clientSecret: clientSecret || undefined,
  });

  return { buy, notify };
}

export function fundingAddresses(): {
  buyer: string;
  sellers: { slug: string; address: string }[];
  uToken: string;
  faucets: { name: string; url: string }[];
} {
  const sellers = ["range-keeper", "yield-router", "health-sentinel", "gridwright"]
    .map((slug) => ({
      slug,
      address: getPin(slug).walletAddress || "",
    }))
    .filter((s) => s.address);

  return {
    buyer:
      process.env.BUYER_WALLET_ADDRESS ||
      getPin("range-keeper").walletAddress ||
      "0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133",
    sellers,
    uToken: "0xcE24439F2D9C6a2289F741120FE202248B666666",
    faucets: [
      {
        name: "Send BNB on BNB Smart Chain (chain 56) — not Ethereum, not testnet",
        url: "https://bscscan.com/",
      },
      {
        name: "Mainnet payment token U (commerce.paymentToken)",
        url: "https://bscscan.com/token/0xcE24439F2D9C6a2289F741120FE202248B666666",
      },
    ],
  };
}
