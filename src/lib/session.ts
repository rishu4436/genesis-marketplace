import { cookies } from "next/headers";
import {
  COOKIE,
  createSession,
  deleteSession,
  getAccount,
  getSession,
  type Account,
} from "./accounts";

export async function setSessionCookie(sessionId: string) {
  const jar = await cookies();
  jar.set(COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) await deleteSession(sid);
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireAccount(): Promise<Account | null> {
  return currentAccount();
}

export async function currentAccount(): Promise<Account | null> {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (!sid) return null;
  const ses = await getSession(sid);
  if (!ses) return null;
  return getAccount(ses.accountId);
}

export async function loginAccount(account: Account) {
  const ses = await createSession(account.id);
  await setSessionCookie(ses.id);
  const { recoverJobsAfterLogin } = await import("./job-recovery");
  await recoverJobsAfterLogin(account);
  return account;
}
