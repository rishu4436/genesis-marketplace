"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GenesisMark } from "@/components/brand/GenesisMark";

const PRIMARY = [
  { href: "/shop", label: "Shop" },
  { href: "/browse", label: "Browse" },
  { href: "/hire", label: "Buy" },
  { href: "/compare", label: "Compare" },
];

const MORE = [
  { href: "/dashboard", label: "My hires" },
  { href: "/packages", label: "Packages" },
  { href: "/advantage", label: "Advantage" },
  { href: "/why", label: "Why Genesis" },
  { href: "/for-agents", label: "For agents" },
  { href: "/sell", label: "Sell" },
  { href: "/altana", label: "Altana" },
  { href: "/judge", label: "Judge" },
  { href: "/termix", label: "TermiX" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled || !isHome
          ? "border-b border-white/[0.06] bg-[#05060a]/90"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <GenesisMark href="/" size="md" showWordmark animated />

        <nav className="hidden items-center gap-0.5 md:flex">
          {PRIMARY.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-[0.875rem] font-medium tracking-tight transition ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`rounded-full px-3.5 py-1.5 text-[0.875rem] font-medium tracking-tight transition ${
                moreOpen || MORE.some((m) => navActive(pathname, m.href))
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white"
              }`}
              aria-expanded={moreOpen}
            >
              More
            </button>
            <AnimatePresence>
              {moreOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close"
                    onClick={() => setMoreOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1018] py-1.5 shadow-2xl shadow-black/50"
                  >
                    {MORE.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-3.5 py-2 text-sm tracking-tight transition hover:bg-white/5 ${
                          navActive(pathname, item.href)
                            ? "text-amber-200"
                            : "text-white/65"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/profile"
            className={`ml-1 rounded-full px-3.5 py-1.5 text-[0.875rem] font-medium tracking-tight transition ${
              navActive(pathname, "/profile")
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            Profile
          </Link>
          <Link
            href="/hire"
            className="btn-primary ml-2 !px-4 !py-2 !text-[0.8rem]"
          >
            Buy an agent
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/profile"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80"
          >
            Profile
          </Link>
          <Link
            href="/hire"
            className="rounded-full bg-[#F0B90B] px-3.5 py-1.5 text-xs font-semibold text-black"
          >
            Buy
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <div className="flex w-4 flex-col gap-1">
              <span
                className={`h-0.5 w-full rounded bg-white transition ${open ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`h-0.5 w-full rounded bg-white transition ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`h-0.5 w-full rounded bg-white transition ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
              />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.06] bg-[#05060a] md:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col px-5 py-3 sm:px-8">
              {[{ href: "/profile", label: "Profile" }, ...PRIMARY, ...MORE].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-3 text-sm font-medium tracking-tight ${
                    navActive(pathname, item.href)
                      ? "bg-white/[0.06] text-white"
                      : "text-white/60"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/hire" className="btn-primary mt-2 w-full">
                Buy an agent
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
