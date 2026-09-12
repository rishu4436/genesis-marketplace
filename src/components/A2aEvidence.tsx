import { a2aEvidence } from "@/lib/capability";
import type { Agent } from "@/lib/types";

export function A2aEvidence({ agent }: { agent: Agent }) {
  const ev = a2aEvidence(agent);
  if (!ev.cardUrl && !ev.endpoint) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        A2A
      </p>
      <dl className="mt-2 space-y-1.5 text-[12px] leading-snug">
        {ev.cardUrl && (
          <div className="flex gap-3">
            <dt className="w-[6.5rem] shrink-0 text-white/40">Card</dt>
            <dd className="min-w-0 break-all">
              <a
                href={ev.cardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-200 hover:underline"
              >
                {ev.cardUrl}
              </a>
            </dd>
          </div>
        )}
        {ev.endpoint && ev.endpoint !== ev.cardUrl && (
          <div className="flex gap-3">
            <dt className="w-[6.5rem] shrink-0 text-white/40">Endpoint</dt>
            <dd className="min-w-0 break-all text-white/70">{ev.endpoint}</dd>
          </div>
        )}
        {ev.lastProbeAt && (
          <div className="flex gap-3">
            <dt className="w-[6.5rem] shrink-0 text-white/40">Last probe</dt>
            <dd className="text-white/70">
              {ev.lastProbeKind ? `${ev.lastProbeKind} · ` : ""}
              {ev.lastProbeAt}
            </dd>
          </div>
        )}
        {ev.protocols.length > 0 && (
          <div className="flex gap-3">
            <dt className="w-[6.5rem] shrink-0 text-white/40">Protocol</dt>
            <dd className="text-white/70">{ev.protocols.join(" · ")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
