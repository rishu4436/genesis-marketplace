"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GenesisMark } from "@/components/brand/GenesisMark";
import { AuthNav } from "@/components/AuthNav";
import { HIRE_NOW_HREF } from "@/lib/genesis-agents";

const PRIMARY = [
  { href: "/judge", label: "Judge" },
  { href: "/dashboard", label: "My hires" },
  { href: "/browse", label: "Browse" },
];

const MOBILE = [
  { href: "/browse", label: "Browse" },
  { href: "/judge", label: "Judge" },
  { href: "/dashboard", label: "My hires" },
  { href: "/packages", label: "Packages" },
  { href: "/partners", label: "Partners" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    setOpen(false);
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
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[1160px] items-center justify-between gap-3 px-4 sm:px-8">
        <GenesisMark
          href="/"
          size="md"
          showWordmark
          animated
          className="min-w-0 [&>span:last-child]:hidden sm:[&>span:last-child]:flex"
        />

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
          <Link
            href={HIRE_NOW_HREF}
            className={`btn-solid ml-2 !h-9 !px-4 !text-[0.8rem] ${
              navActive(pathname, "/browse") ? "ring-1 ring-white/20" : ""
            }`}
          >
            Hire
          </Link>
          <span className="ml-1.5">
            <AuthNav />
          </span>
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/[0.04] text-white"
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
            className="border-t border-white/[0.06] bg-[#05060a] md:hidden"
          >
            <nav className="mx-auto flex max-w-[1160px] flex-col px-5 py-3 sm:px-8">
              <Link href={HIRE_NOW_HREF} className="btn-solid mb-2 mt-1 !h-11 w-full !text-sm">
                Hire
              </Link>
              {MOBILE.map((item) => (
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
              <AuthNav stacked />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
