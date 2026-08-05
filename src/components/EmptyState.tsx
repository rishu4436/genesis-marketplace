import Link from "next/link";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-lg text-white/40">
        ∅
      </div>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/50">
        {body}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-full bg-[#F0B90B] px-4 py-2 text-xs font-semibold text-black hover:bg-amber-300"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
