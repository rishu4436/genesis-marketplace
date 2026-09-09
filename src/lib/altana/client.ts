/**
 * Altana SDK wrappers for Genesis marketplace.
 * Live: ALTANA_ADMIN_PRIVATE_KEY → grantSession + Keystore register on BSC.
 * Demo: policy record only (explicit forceDemo, or missing key).
 * Live grants never silently fall back to demo.
 */

import {
  createClient,
  BNB,
  BNB_TESTNET,
  TESTNET_RELAY_URL,
  signerFromPrivateKey,
} from "@altananetwork/sdk";
import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getPolicy, type AgentPolicyTemplate } from "./policies";
import {
  newSessionId,
  saveSession,
  type StoredAltanaSession,
  publicSession,
} from "./session-store";
import { getGenesisAgent } from "@/lib/genesis-agents";
import { writeLiveProof } from "./proof";

export type AltanaNetwork = "bnb-testnet" | "bnb";

const MIN_LIVE_WEI = BigInt("20000000000000000"); // 0.02 tBNB
const FAUCET_WEI = BigInt("50000000000000000"); // 0.05 tBNB

export function altanaNetwork(): AltanaNetwork {
  const raw = (process.env.ALTANA_NETWORK || "").trim().toLowerCase();
  if (raw === "testnet" || raw === "bnb-testnet" || raw === "97") {
    return "bnb-testnet";
  }
  return "bnb";
}

export function altanaChainId(): number {
  return altanaNetwork() === "bnb" ? 56 : 97;
}

export function hasAltanaAdminKey(): boolean {
  return Boolean(process.env.ALTANA_ADMIN_PRIVATE_KEY?.trim());
}

export function altanaKeystore(): `0x${string}` {
  return chainConfig().keyStore;
}

export function explorerTxUrl(hash: string): string {
  const base =
    altanaChainId() === 56
      ? "https://bscscan.com/tx/"
      : "https://testnet.bscscan.com/tx/";
  return `${base}${hash}`;
}

export function explorerAddressUrl(addr: string): string {
  const base =
    altanaChainId() === 56
      ? "https://bscscan.com/address/"
      : "https://testnet.bscscan.com/address/";
  return `${base}${addr}`;
}

export function adminAddressFromEnv(): string | null {
  const k = process.env.ALTANA_ADMIN_PRIVATE_KEY?.trim();
  if (!k) return null;
  try {
    const hex = (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
    return privateKeyToAccount(hex).address;
  } catch {
    return null;
  }
}

/** Public status for UI / judges */
export function altanaStatus() {
  const network = altanaNetwork();
  const liveCapable = hasAltanaAdminKey();
  return {
    provider: "Altana",
    docs: "https://docs.altana.network",
    network,
    chainId: altanaChainId(),
    liveCapable,
    mode: liveCapable ? "live-ready" : "demo-policy",
    adminAddress: adminAddressFromEnv(),
    keystore: altanaKeystore(),
    keystoreExplorer: explorerAddressUrl(altanaKeystore()),
    note: liveCapable
      ? network === "bnb"
        ? "Admin key configured — Grant session writes Keystore on BSC mainnet"
        : "Admin key configured — Grant session writes Keystore on BSC testnet"
      : "Set ALTANA_ADMIN_PRIVATE_KEY + ALTANA_NETWORK=mainnet + fund ~0.05 BNB for a mainnet Keystore grant",
    explorer:
      altanaChainId() === 56
        ? "https://bscscan.com"
        : "https://testnet.bscscan.com",
    faucet: "https://testnet.bnbchain.org/faucet-smart",
  };
}

function chainConfig() {
  return altanaNetwork() === "bnb" ? BNB : BNB_TESTNET;
}

function adminKey(): `0x${string}` {
  const k = process.env.ALTANA_ADMIN_PRIVATE_KEY?.trim();
  if (!k) throw new Error("ALTANA_ADMIN_PRIVATE_KEY not set");
  return (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
}

export async function createAltanaWalletLive(): Promise<{
  address: string;
  mode: "live";
}> {
  const client = createClient({ chains: [chainConfig()] });
  const signer = signerFromPrivateKey(adminKey());
  const wallet = await client.createWallet({ signer });
  return { address: wallet.address, mode: "live" };
}

function bnbToWei(bnb: string): bigint {
  const [i, f = ""] = bnb.split(".");
  const frac = (f + "000000000000000000").slice(0, 18);
  return (
    BigInt(i || "0") * BigInt(10) ** BigInt(18) + BigInt(frac || "0")
  );
}

function policyToSdkPermissions(policy: AgentPolicyTemplate) {
  const spend = [
    {
      limit: bnbToWei(policy.nativeSpendBnb),
      period: "day" as const,
    },
    ...policy.tokenSpends.map((t) => ({
      limit: BigInt(t.limit),
      period: t.period as "day",
      ...(t.token ? { token: t.token } : {}),
    })),
  ];
  const calls = policy.calls
    .filter((c): c is { to: `0x${string}` } => Boolean(c.to))
    .map((c) => ({ to: c.to }));
  return { calls, spend };
}

function sessionSignerKey(session: unknown): string | undefined {
  const signer = (session as { signer?: Record<string, unknown> }).signer;
  const pk = signer?._privateKey ?? signer?.privateKey;
  return typeof pk === "string" ? pk : undefined;
}

const TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545";
const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

async function ensureTestnetBalance(walletAddress: `0x${string}`): Promise<{
  faucetTxHash?: string;
}> {
  const network = chainConfig();
  if (network.chainId !== 97) return {};

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(TESTNET_RPC),
  });
  const bal = await publicClient.getBalance({ address: walletAddress });
  if (bal >= MIN_LIVE_WEI) return {};

  const res = await fetch(TESTNET_RELAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_addFaucetFunds",
      params: [
        {
          address: walletAddress,
          chainId: 97,
          tokenAddress: NATIVE_TOKEN,
          value: `0x${FAUCET_WEI.toString(16)}`,
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    result?: { transactionHash?: string };
    error?: { message?: string };
  };
  if (json.error?.message) {
    throw new Error(
      `Altana faucet failed: ${json.error.message}. Fund ${walletAddress} at ${altanaStatus().faucet}`,
    );
  }
  const faucetTxHash = json.result?.transactionHash;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const next = await publicClient.getBalance({ address: walletAddress });
    if (next >= MIN_LIVE_WEI) return { faucetTxHash };
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Faucet did not credit ${walletAddress} in time. Fund it at ${altanaStatus().faucet}`,
  );
}

async function ensureMainnetBalance(walletAddress: `0x${string}`): Promise<void> {
  if (chainConfig().chainId !== 56) return;
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http("https://bsc-dataseed.binance.org"),
  });
  const bal = await publicClient.getBalance({ address: walletAddress });
  if (bal >= MIN_LIVE_WEI) return;
  throw new Error(
    `Admin EOA ${walletAddress} has ${(Number(bal) / 1e18).toFixed(4)} BNB. Send ~0.05 BNB on BSC mainnet, then Grant again.`,
  );
}

/**
 * Grant a session for a Genesis specialist.
 * Live is the default when the admin key is set.
 * Demo only when forceDemo is true, or when no key is configured.
 */
export async function grantAgentSession(opts: {
  agentSlug: string;
  expiryHours?: number;
  forceDemo?: boolean;
}): Promise<Omit<StoredAltanaSession, "sessionPrivateKey">> {
  const policy = getPolicy(opts.agentSlug);
  if (!policy) throw new Error(`No Altana policy for agent ${opts.agentSlug}`);
  const agent = getGenesisAgent(opts.agentSlug);
  const hours = opts.expiryHours ?? policy.defaultExpiryHours;
  const expiry = Math.floor(Date.now() / 1000) + hours * 3600;
  const id = newSessionId();
  const chainId = altanaChainId();

  const permissionsPublic = {
    calls: policy.calls.map((c) => ({
      to: c.to,
      signature: c.signature,
    })),
    spend: [
      {
        limit: bnbToWei(policy.nativeSpendBnb).toString(),
        period: "day",
        label: `${policy.nativeSpendBnb} BNB / day (gas)`,
      },
      ...policy.tokenSpends.map((t) => ({
        limit: t.limit,
        period: t.period,
        token: t.token,
        label: t.label,
      })),
    ],
  };

  const wantDemo = Boolean(opts.forceDemo) || !hasAltanaAdminKey();
  if (wantDemo) {
    const demoPk = generatePrivateKey();
    const account = privateKeyToAccount(demoPk);
    const rec: StoredAltanaSession = {
      id,
      agentSlug: opts.agentSlug,
      agentName: agent?.name || opts.agentSlug,
      walletAddress: account.address,
      publicKey: `0xdemo_${account.address.slice(2, 18)}` as string,
      permissions: permissionsPublic,
      expiry,
      status: "demo",
      mode: "demo",
      network: altanaNetwork(),
      chainId,
      createdAt: new Date().toISOString(),
      policyTitle: policy.title,
      sessionPrivateKey: demoPk,
      explorerUrl: explorerAddressUrl(account.address),
    };
    await saveSession(rec);
    return publicSession(rec);
  }

  const network = chainConfig();
  const client = createClient({ chains: [network] });
  const admin = signerFromPrivateKey(adminKey());
  const wallet = await client.createWallet({ signer: admin });
  const funded = await ensureTestnetBalance(wallet.address);
  await ensureMainnetBalance(wallet.address);
  const permissions = policyToSdkPermissions(policy);

  const session = await client.grantSession({
    wallet,
    signer: admin,
    permissions,
    expiry,
    register: true,
    chainId: network.chainId,
  });

  const sessionPk = sessionSignerKey(session);
  const txHash = session.transactionHash;

  const rec: StoredAltanaSession = {
    id,
    agentSlug: opts.agentSlug,
    agentName: agent?.name || opts.agentSlug,
    walletAddress: session.walletAddress || wallet.address,
    publicKey: String(session.publicKey || ""),
    permissions: permissionsPublic,
    expiry: session.expiry || expiry,
    transactionHash: txHash,
    faucetTxHash: funded.faucetTxHash,
    adminAddress: admin.address,
    keystore: network.keyStore,
    status: "active",
    mode: "live",
    network: altanaNetwork(),
    chainId,
    createdAt: new Date().toISOString(),
    policyTitle: policy.title,
    sessionPrivateKey: sessionPk,
    explorerUrl: txHash
      ? explorerTxUrl(txHash)
      : explorerAddressUrl(wallet.address),
  };
  await saveSession(rec);

  try {
    await writeLiveProof({
      network: altanaNetwork(),
      chainId,
      walletAddress: rec.walletAddress,
      adminAddress: admin.address,
      keystore: network.keyStore,
      transactionHash: txHash,
      faucetTxHash: funded.faucetTxHash,
      explorerUrl: rec.explorerUrl || explorerAddressUrl(rec.walletAddress),
      keystoreExplorer: explorerAddressUrl(network.keyStore),
      agentSlug: rec.agentSlug,
      agentName: rec.agentName,
      grantedAt: rec.createdAt,
      sessionId: rec.id,
    });
  } catch {
    /* proof file is optional; session is already saved */
  }

  return publicSession(rec);
}

export async function revokeAgentSession(
  sessionId: string,
): Promise<Omit<StoredAltanaSession, "sessionPrivateKey">> {
  const { getSession, saveSession: save } = await import("./session-store");
  const s = await getSession(sessionId);
  if (!s) throw new Error("Session not found");

  if (s.mode === "live" && hasAltanaAdminKey() && s.status === "active") {
    try {
      const client = createClient({ chains: [chainConfig()] });
      const admin = signerFromPrivateKey(adminKey());
      const wallet = await client.createWallet({ signer: admin });
      if (s.sessionPrivateKey) {
        const sessionSigner = signerFromPrivateKey(
          s.sessionPrivateKey as `0x${string}`,
        );
        await client.revokeSession({
          wallet,
          signer: admin,
          session: {
            walletAddress: s.walletAddress as `0x${string}`,
            publicKey: s.publicKey as `0x${string}`,
            permissions: {
              calls: (s.permissions?.calls || [])
                .filter((c) => c.to)
                .map((c) => ({ to: c.to as `0x${string}` })),
              spend: (s.permissions?.spend || []).map((sp) => ({
                limit: BigInt(sp.limit),
                period: (sp.period || "day") as "day",
                ...(sp.token ? { token: sp.token as `0x${string}` } : {}),
              })),
            },
            expiry: s.expiry,
            signer: sessionSigner,
          },
        });
      }
    } catch {
      /* local revoke still applies for product control */
    }
  }

  s.status = "revoked";
  s.revokedAt = new Date().toISOString();
  await save(s);
  return publicSession(s);
}
