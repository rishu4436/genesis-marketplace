import Link from "next/link";

export function CatalogModeNav({
  active,
}: {
  active: "browse" | "index";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href="/browse"
        className={`rounded-2xl border px-4 py-3.5 transition ${
          active === "browse"
            ? "border-amber-400/50 bg-amber-400/[0.1]"
            : "border-white/10 bg-white/[0.03] hover:border-amber-400/30"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            active === "browse" ? "text-amber-100" : "text-white"
          }`}
        >
          Browse
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
          Hireable catalog. By Genesis specialists and live A2A we can
          complete a hire against. This is the desk — pick an agent and
          Get plan or Hire with escrow on the listing.
        </p>
      </Link>
      <Link
        href="/browse?index=1"
        className={`rounded-2xl border px-4 py-3.5 transition ${
          active === "index"
            ? "border-rose-400/40 bg-rose-400/[0.08]"
            : "border-white/10 bg-white/[0.03] hover:border-rose-400/25"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            active === "index" ? "text-rose-100" : "text-white"
          }`}
        >
          Index
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
          Raw ERC-8004 identity dump on BSC. Most rows are Unhireable
          (HTTP-alive or name-only). Shown so the registry is not hidden.
          Not a hire floor.
        </p>
      </Link>
    </div>
  );
}
