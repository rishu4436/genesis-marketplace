import Link from "next/link";

export function CatalogModeNav({
  active,
}: {
  active: "browse" | "index";
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <Link
        href="/browse"
        className={`rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3.5 transition ${
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
        <p className="mt-1.5 hidden text-[12px] leading-relaxed text-white/55 sm:block">
          Hireable catalog. By Genesis specialists and live A2A we can
          complete a hire against. Unhireable identities stay on Index.
        </p>
      </Link>
      <Link
        href="/browse?index=1"
        className={`rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3.5 transition ${
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
        <p className="mt-1.5 hidden text-[12px] leading-relaxed text-white/55 sm:block">
          Raw ERC-8004 identity dump on BSC. Most rows are Unhireable
          (HTTP-alive or name-only). Shown so the registry is not hidden.
          Not a hire floor.
        </p>
      </Link>
    </div>
  );
}
