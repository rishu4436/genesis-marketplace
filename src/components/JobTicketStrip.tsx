import type { JobTicket } from "@/lib/job-ticket";

export function JobTicketStrip({
  ticket,
  dense = false,
}: {
  ticket: JobTicket;
  dense?: boolean;
}) {
  const row = (k: string, v: string) => (
    <div className="flex gap-2">
      <dt className="w-9 shrink-0 text-white/30">{k}</dt>
      <dd className="min-w-0 text-white/65">{v}</dd>
    </div>
  );

  if (ticket.completes === "none") {
    return (
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-rose-200/80">
        Unhireable · identity only
      </p>
    );
  }

  return (
    <dl
      className={
        dense
          ? "mt-2 space-y-0.5 text-[10px] leading-snug"
          : "mt-3 space-y-1 text-[11px] leading-snug"
      }
    >
      {row("Job", ticket.job)}
      {row("Send", ticket.youSend)}
      {row("Get", ticket.youGet)}
      {row("Pay", `Plan free · ${ticket.lockLabel}`)}
    </dl>
  );
}

export function JobTicketPanel({ ticket }: { ticket: JobTicket }) {
  const rows: { k: string; v: string }[] = [
    { k: "Job", v: ticket.job },
    { k: "You send", v: ticket.youSend },
    { k: "You get", v: ticket.youGet },
    { k: "Plan", v: "Free · you keep the keys" },
    { k: "Optional lock", v: ticket.lockLabel },
    { k: "Completes", v: ticket.completesLabel },
    { k: "Identity", v: ticket.passport },
  ];
  if (ticket.etaMinutes != null) {
    rows.push({ k: "ETA", v: `~${ticket.etaMinutes}m` });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Job ticket
      </p>
      <dl className="mt-2 space-y-1.5 text-[12px] leading-snug">
        {rows.map((r) => (
          <div key={r.k} className="flex gap-3">
            <dt className="w-[6.5rem] shrink-0 text-white/40">{r.k}</dt>
            <dd className="min-w-0 text-white/75">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
