import Link from "next/link";
import { GENESIS_AGENTS } from "@/lib/genesis-agents";
import { getGenesisAgent } from "@/lib/genesis-agents";
import { pinStatus } from "@/lib/pins";

export const metadata = {
  title: "Ops · pins & APEX",
};

export const dynamic = "force-dynamic";

export default function OpsPage() {
  const rows = GENESIS_AGENTS.map((a) => {
    const resolved = getGenesisAgent(a.slug)!;
    const st = pinStatus(a.slug);
    return { a, resolved, st };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-white">Ops · agent pins</h1>
      <p className="mt-2 text-sm text-white/55">
        Priority 1 status: local APEX is live for every Genesis seller. Fill{" "}
        <code className="text-amber-200/90">config/pins.json</code> after{" "}
        <code className="text-amber-200/90">bag deploy</code> + ERC-8004 register.
      </p>

      <div className="mt-8 space-y-4">
        {rows.map(({ a, resolved, st }) => (
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
              <div className="flex gap-2 text-[10px]">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    st.hasToken
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {st.hasToken ? "ERC-8004 pinned" : "token pending"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    st.hasExternalService
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  {st.hasExternalService ? "external APEX" : "local APEX"}
                </span>
              </div>
            </div>
            <dl className="mt-3 space-y-1 font-mono text-[11px] text-white/55">
              <div>
                serviceUrl:{" "}
                <span className="text-white/80">{resolved.serviceUrl}</span>
              </div>
              <div>
                chain:token:{" "}
                {resolved.tokenId
                  ? `${resolved.chainId}:${resolved.tokenId}`
                  : "—"}
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/genesis/${a.slug}`}
                className="text-amber-300 hover:underline"
              >
                Open seller →
              </Link>
              <a
                href={`/api/apex/${a.slug}/health`}
                className="text-amber-300 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Health
              </a>
              <Link
                href={`/api/apex/${a.slug}/negotiate`}
                className="text-white/40"
              >
                Negotiate POST only
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/55">
        <p className="font-semibold text-white/80">Studio deploy path</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Read <code className="text-amber-200/80">agents/README.md</code>
          </li>
          <li>
            Paste each <code className="text-amber-200/80">STUDIO_PROMPT.md</code>{" "}
            into Cursor after <code className="text-amber-200/80">bag skills install</code>
          </li>
          <li>Wallet + llm activate + bag dev → test negotiate on :8003</li>
          <li>Deploy + erc8004 register → fill pins.json</li>
        </ol>
      </div>
    </div>
  );
}
