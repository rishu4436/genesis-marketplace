import Link from "next/link";
import type { AgentHealth } from "@/lib/agent-health";
import { shortHex } from "@/lib/seller-identity";

const CHECK_LABEL: Record<string, string> = {
  identity: "Identity",
  runtime: "Runtime",
  version: "Version",
  mandate: "Mandate",
  evidence: "Evidence",
  platform: "Platform",
};

export function SellerIdentityPanel({ health }: { health: AgentHealth }) {
  const { identity, checks, evidence } = health;
  const rows = (
    [
      "identity",
      "runtime",
      "version",
      "mandate",
      "evidence",
      "platform",
    ] as const
  ).map((id) => ({ id, ...checks[id] }));

  return (
    <section
      className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      aria-label="Seller identity"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Bound identity
        </p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
          {health.hireable ? "Hireable" : "Not hireable"}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/45">
          {identity.version}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-[11px] text-white/55 sm:grid-cols-2">
        <div>
          <dt className="text-white/35">Seller</dt>
          <dd className="mt-0.5 font-mono">{identity.sellerId}</dd>
        </div>
        <div>
          <dt className="text-white/35">ERC-8004</dt>
          <dd className="mt-0.5 font-mono">
            {identity.erc8004
              ? `chain ${identity.chainId} · #${identity.tokenId}`
              : "unpinned"}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Controller</dt>
          <dd className="mt-0.5 font-mono break-all">
            {identity.controller || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Identity hash</dt>
          <dd className="mt-0.5 font-mono break-all">
            {shortHex(identity.identityHash)}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-[11px]"
          >
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                row.ok ? "bg-emerald-400" : "bg-white/25"
              }`}
            />
            <span>
              <span className="text-white/70">{CHECK_LABEL[row.id]}</span>
              <span className="mt-0.5 block text-white/40">{row.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {evidence ? (
        <p className="mt-3 text-[11px] text-white/45">
          Last receipt{" "}
          <Link
            href={`/jobs/${encodeURIComponent(evidence.jobId)}`}
            className="text-amber-300 hover:underline"
          >
            {evidence.jobId}
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-white/35">
          No version-matched receipt yet — hire still returns a plan.
        </p>
      )}

      <p className="mt-2">
        <Link
          href={`/api/agents/${identity.sellerId.replace("genesis:", "")}/identity`}
          className="text-[11px] text-amber-300 hover:underline"
        >
          Open machine identity
        </Link>
      </p>
    </section>
  );
}
