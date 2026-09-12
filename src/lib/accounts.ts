/**
 * Buyer accounts. Email+password or wallet signature.
 * Memory + disk (dev) + KV (prod if configured).
 */

import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { recoverMessageAddress } from "viem";
import { kvCmd } from "./kv";
import type { BuyerRisk } from "./buyer-context";

export type Account = {
  id: string;
  createdAt: string;
  email?: string;
  passwordHash?: string;
  wallet?: string;
  displayName?: string;
  risk: BuyerRisk;
  jobIds: string[];
};

export type PublicAccount = {
  id: string;
  createdAt: string;
  email?: string;
  wallet?: string;
  displayName?: string;
  risk: BuyerRisk;
  hireCount: number;
};

export type Session = {
  id: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
};

const memAcc = new Map<string, Account>();
const emailIndex = new Map<string, string>();
const walletIndex = new Map<string, string>();
const sessions = new Map<string, Session>();
const nonces = new Map<string, { at: number }>();

function accountsDir() {
  return path.join(process.cwd(), "data", "accounts");
}

function accPath(id: string) {
  return path.join(accountsDir(), `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

async function ensureDir() {
  try {
    await fs.mkdir(accountsDir(), { recursive: true });
  } catch {
    /* ignore */
  }
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function normWallet(addr: string) {
  return addr.trim().toLowerCase();
}

export function publicAccount(a: Account): PublicAccount {
  return {
    id: a.id,
    createdAt: a.createdAt,
    email: a.email,
    wallet: a.wallet,
    displayName: a.displayName,
    risk: a.risk,
    hireCount: a.jobIds.length,
  };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

import { loginMessage, listAgentMessage } from "./auth-messages";
export { loginMessage, listAgentMessage };

function indexAcc(a: Account) {
  memAcc.set(a.id, a);
  if (a.email) emailIndex.set(normEmail(a.email), a.id);
  if (a.wallet) walletIndex.set(normWallet(a.wallet), a.id);
}

export async function saveAccount(a: Account): Promise<Account> {
  indexAcc(a);
  try {
    await ensureDir();
    await fs.writeFile(accPath(a.id), JSON.stringify(a, null, 2), "utf8");
  } catch {
    /* memory still holds */
  }
  await kvCmd("SET", `genesis:acc:${a.id}`, JSON.stringify(a));
  if (a.email) await kvCmd("SET", `genesis:email:${normEmail(a.email)}`, a.id);
  if (a.wallet) await kvCmd("SET", `genesis:wallet:${normWallet(a.wallet)}`, a.id);
  return a;
}

export async function getAccount(id: string): Promise<Account | null> {
  if (memAcc.has(id)) return memAcc.get(id)!;
  try {
    const raw = await fs.readFile(accPath(id), "utf8");
    const a = JSON.parse(raw) as Account;
    indexAcc(a);
    return a;
  } catch {
    /* kv */
  }
  const fromKv = await kvCmd<string>("GET", `genesis:acc:${id}`);
  if (fromKv) {
    try {
      const a = JSON.parse(fromKv) as Account;
      indexAcc(a);
      return a;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function getAccountByEmail(email: string): Promise<Account | null> {
  const key = normEmail(email);
  const local = emailIndex.get(key);
  if (local) return getAccount(local);
  const id = await kvCmd<string>("GET", `genesis:email:${key}`);
  if (id) return getAccount(id);
  return null;
}

export async function getAccountByWallet(addr: string): Promise<Account | null> {
  const key = normWallet(addr);
  const local = walletIndex.get(key);
  if (local) return getAccount(local);
  const id = await kvCmd<string>("GET", `genesis:wallet:${key}`);
  if (id) return getAccount(id);
  return null;
}

export async function createEmailAccount(opts: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<Account> {
  const email = normEmail(opts.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email");
  }
  if (opts.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  if (await getAccountByEmail(email)) {
    throw new Error("An account already exists for that email");
  }
  const a: Account = {
    id: newId("acc"),
    createdAt: new Date().toISOString(),
    email,
    passwordHash: hashPassword(opts.password),
    displayName: opts.displayName?.trim() || email.split("@")[0],
    risk: "moderate",
    jobIds: [],
  };
  return saveAccount(a);
}

export async function loginEmail(
  email: string,
  password: string,
): Promise<Account> {
  const a = await getAccountByEmail(email);
  if (!a?.passwordHash || !checkPassword(password, a.passwordHash)) {
    throw new Error("Email or password is wrong");
  }
  return a;
}

export async function issueNonce(): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  const at = Date.now();
  nonces.set(nonce, { at });
  await kvCmd("SET", `genesis:nonce:${nonce}`, String(at), "EX", 600);
  return nonce;
}

export async function takeNonce(nonce: string): Promise<boolean> {
  const key = `genesis:nonce:${nonce}`;
  const fromKv = await kvCmd<string>("GET", key);
  if (fromKv) {
    await kvCmd("DEL", key);
    nonces.delete(nonce);
    return true;
  }
  const row = nonces.get(nonce);
  if (!row) return false;
  nonces.delete(nonce);
  return Date.now() - row.at < 10 * 60 * 1000;
}

export async function loginOrCreateWallet(
  address: string,
  signature: string,
  nonce: string,
): Promise<Account> {
  if (!(await takeNonce(nonce))) throw new Error("Sign-in expired. Try again.");
  const recovered = await recoverMessageAddress({
    message: loginMessage(nonce),
    signature: signature as `0x${string}`,
  });
  if (normWallet(recovered) !== normWallet(address)) {
    throw new Error("Signature does not match wallet");
  }
  const wallet = recovered;
  const existing = await getAccountByWallet(wallet);
  if (existing) return existing;
  const a: Account = {
    id: newId("acc"),
    createdAt: new Date().toISOString(),
    wallet: normWallet(wallet),
    displayName: `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
    risk: "moderate",
    jobIds: [],
  };
  return saveAccount(a);
}

export async function createSession(accountId: string): Promise<Session> {
  const now = Date.now();
  const s: Session = {
    id: newId("ses"),
    accountId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  sessions.set(s.id, s);
  await kvCmd("SET", `genesis:ses:${s.id}`, JSON.stringify(s));
  await kvCmd("EXPIRE", `genesis:ses:${s.id}`, 30 * 24 * 60 * 60);
  return s;
}

export async function getSession(id: string): Promise<Session | null> {
  const local = sessions.get(id);
  if (local) {
    if (new Date(local.expiresAt).getTime() < Date.now()) {
      sessions.delete(id);
      return null;
    }
    return local;
  }
  const raw = await kvCmd<string>("GET", `genesis:ses:${id}`);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    if (new Date(s.expiresAt).getTime() < Date.now()) return null;
    sessions.set(s.id, s);
    return s;
  } catch {
    return null;
  }
}

export async function deleteSession(id: string) {
  sessions.delete(id);
  await kvCmd("DEL", `genesis:ses:${id}`);
}

export async function attachJob(accountId: string, jobId: string) {
  const a = await getAccount(accountId);
  if (!a) return;
  if (!a.jobIds.includes(jobId)) {
    a.jobIds = [jobId, ...a.jobIds].slice(0, 80);
    await saveAccount(a);
  }
}

export const COOKIE = "genesis_sid";
