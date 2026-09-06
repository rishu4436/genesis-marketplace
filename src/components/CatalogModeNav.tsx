import Link from "next/link";

export function CatalogModeNav({
  active,
}: {
  active: "hireable" | "browse" | "index";
}) {
  const pill = (on: boolean) =>
    on
      ? "bg-[#F0B90B] text-black"
      : "border border-white/10 bg-white/5 text-white/65 hover:border-amber-400/30 hover:text-amber-100";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/hire"
        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${pill(active === "hireable")}`}
      >
        Hire
      </Link>
      <Link
        href="/browse"
        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${pill(active === "browse")}`}
      >
        Browse hireable
      </Link>
      <p className="text-[11px] text-white/40">
        Intelligent mode on — only agents you can hire.
      </p>
    </div>
  );
}
