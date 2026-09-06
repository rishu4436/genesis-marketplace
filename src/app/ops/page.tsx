import Link from "next/link";
import { GENESIS_AGENTS, getGenesisAgent } from "@/lib/genesis-agents";
import { getPin, pinStatus } from "@/lib/pins";
import {
  LOCAL_APEX_AGENTS,
  PLATFORM_LIVE_AGENTS,
  PLATFORM_TRIAL_EXPIRES_AT,
  trialStatus,
} from "@/lib/trial";
import { getPlatformConfig } from "@/lib/platform-a2a";

export const metadata = {
  title: "Ops · pins & trial",
};

export const dynamic = "force-dynamic";

export default function OpsPage() {
  const trial = trialStatus();
  const rows = GENESIS_AGENTS.map((a) => {
    const resolved = getGenesisAgent(a.slug)!;
    const st = pinStatus(a.slug);
    const pin = getPin(a.slug);
    const platform = getPlatformConfig(a.slug);
    return { a, resolved, st, pin, platform };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-white">Ops · agents & trial</h1>
      <p className="mt-2 text-sm text-white/55">
        Free BNB managed platform: max 3 concurrent agents. Marketplace hire falls
        back to local APEX if cloud expires.
      </p>

      <div
        className={`mt-6 rounded-2xl border p-4 ${
          trial.expired
            ? "border-rose-500/30 bg-rose-500/10"
            : "border-amber-400/30 bg-amber-400/10"
        }`}
      >
        <div className="text-xs font-medium uppercase tracking-wider text-white/50">
          Platform trial
        </div>
        <p className="mt-1 text-sm font-semibold text-white">{trial.label}</p>
        <p className="mt-1 font-mono text-[11px] text-white/45">
          Expires {PLATFORM_TRIAL_EXPIRES_AT} · quota 3 concurrent
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          {PLATFORM_LIVE_AGENTS.map((a) => (
            <span
              key={a.slug}
              className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200"
            >
              {a.name} · expired testnet #{a.tokenId}
            </span>
          ))}
          {LOCAL_APEX_AGENTS.map((a) => (
            <span
              key={a.slug}
              className="rounded-full bg-white/10 px-2 py-0.5 text-white/60"
            >
              {a.name} · local
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {rows.map(({ a, resolved, st, pin, platform }) => (
          <div
            key={a.slug}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-white">{a.name}</h2>
                <p className="text-xs text-white/45">
                  {a.categoryId} · {a.slug}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    st.hasToken
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {st.hasToken
                    ? `ERC-8004 #${resolved.tokenId}`
                    : "token pending"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    platform
                      ? "bg-sky-500/20 text-sky-200"
                      : st.hasExternalService
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  {platform
                    ? "BNB platform A2A"
                    : st.hasExternalService
                      ? "external service"
                      : "local APEX"}
                </span>
              </div>
            </div>
            <dl className="mt-3 space-y-1 font-mono text-[11px] text-white/55">
              <div>
                serviceUrl:{" "}
                <span className="break-all text-white/80">
                  {resolved.serviceUrl}
                </span>
              </div>
              {platform && (
                <div>
                  platform agentId:{" "}
                  <span className="text-white/80">{platform.agentId}</span>
                </div>
              )}
              {pin.walletAddress && (
                <div>
                  wallet:{" "}
                  <span className="text-white/80">{pin.walletAddress}</span>
                </div>
              )}
              {pin.notes && (
                <div className="font-sans text-[11px] text-white/40">
                  {pin.notes}
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/genesis/${a.slug}`}
                className="text-amber-300 hover:underline"
              >
                Open seller →
              </Link>
              {platform?.cardUrl && (
                <a
                  href={platform.cardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-300 hover:underline"
                >
                  Agent card ↗
                </a>
              )}
              <a
                href={`/api/apex/${a.slug}/health`}
                className="text-white/45 hover:text-white/70"
                target="_blank"
                rel="noreferrer"
              >
                Local health
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/55">
        <p className="font-semibold text-white/80">Redeploy (while trial active)</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-white/45">{`cd studio/RangeKeeper/app/agent
# load WALLET_PASSWORD + STORAGE_* from ../../.studio/.env.local
bag deploy agent --accept-risk --force
bag deploy verify --endpoint <A2A_URL>
`}</pre>
        <p className="mt-3">
          After expiry: cloud runtimes deleted; marketplace + local APEX remain.
          Waiting on BNB team whether free redeploy is allowed.
        </p>
        <Link href="/termix" className="mt-3 inline-block text-amber-300">
          TermiX report →
        </Link>
      </div>
    </div>
  );
}
