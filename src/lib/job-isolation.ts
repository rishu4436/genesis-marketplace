/**
 * Isolated job execution.
 * Default-deny hosts, call budget, time box, no secrets on the envelope.
 */

import { AsyncLocalStorage } from "async_hooks";
import type {
  IsolationCall,
  IsolationRecord,
  JobSession,
} from "./job-session";

export type IsolationContext = {
  session: JobSession;
  startedAt: number;
  calls: IsolationCall[];
  killed: boolean;
  killReason?: string;
};

const store = new AsyncLocalStorage<IsolationContext>();

export function currentIsolation(): IsolationContext | undefined {
  return store.getStore();
}

export function createIsolation(session: JobSession): IsolationContext {
  return {
    session,
    startedAt: Date.now(),
    calls: [],
    killed: false,
  };
}

export function killIsolation(ctx: IsolationContext, reason: string) {
  ctx.killed = true;
  ctx.killReason = reason;
}

function hostOf(input: RequestInfo | URL): string {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function assertIsolationAllows(
  ctx: IsolationContext,
  host: string,
): { ok: true } | { ok: false; reason: string } {
  if (ctx.killed) {
    return { ok: false, reason: ctx.killReason || "session killed" };
  }
  if (Date.now() - ctx.startedAt > ctx.session.policy.timeoutMs) {
    return { ok: false, reason: "time box exceeded" };
  }
  if (ctx.calls.length >= ctx.session.policy.maxCalls) {
    return { ok: false, reason: "call box exceeded" };
  }
  if (ctx.session.policy.mayMoveFunds) {
    return { ok: false, reason: "session forbids fund movement" };
  }
  if (ctx.session.policy.spend !== "0") {
    return { ok: false, reason: "session spend must be zero" };
  }
  if (!host || !ctx.session.policy.hosts.includes(host)) {
    return { ok: false, reason: `host not allowlisted: ${host || "(empty)"}` };
  }
  return { ok: true };
}

export async function isolatedFetch(
  ctx: IsolationContext,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const host = hostOf(input);
  const gate = assertIsolationAllows(ctx, host);
  const rec: IsolationCall = {
    at: new Date().toISOString(),
    host: host || "(invalid)",
    ok: gate.ok,
    denied: gate.ok ? undefined : gate.reason,
  };
  ctx.calls.push(rec);
  if (!gate.ok) {
    killIsolation(ctx, gate.reason);
    throw new Error(`isolation: ${gate.reason}`);
  }
  return fetch(input, init);
}

/** Fetch that enforces the current job session when one is running. */
export function jobFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const ctx = currentIsolation();
  if (!ctx) return fetch(input, init);
  return isolatedFetch(ctx, input, init);
}

export function finishIsolation(ctx: IsolationContext): IsolationRecord {
  return {
    sessionId: ctx.session.id,
    startedAt: new Date(ctx.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    timeoutMs: ctx.session.policy.timeoutMs,
    callCount: ctx.calls.length,
    calls: ctx.calls,
    killed: ctx.killed,
    killReason: ctx.killReason,
    secretsExposed: false,
  };
}

export async function runIsolated<T>(
  session: JobSession,
  fn: (ctx: IsolationContext) => Promise<T>,
): Promise<{ value?: T; isolation: IsolationRecord; error?: string }> {
  const ctx = createIsolation(session);
  return store.run(ctx, async () => {
    try {
      const value = await Promise.race([
        fn(ctx),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("isolation: time box exceeded")),
            session.policy.timeoutMs + 50,
          );
        }),
      ]);
      if (Date.now() - ctx.startedAt > session.policy.timeoutMs) {
        killIsolation(ctx, "time box exceeded");
      }
      return { value, isolation: finishIsolation(ctx) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "isolation failed";
      if (!ctx.killed) killIsolation(ctx, msg.replace(/^isolation: /, ""));
      return { isolation: finishIsolation(ctx), error: msg };
    }
  });
}
