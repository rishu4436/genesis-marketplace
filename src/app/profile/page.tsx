import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/session";

export const metadata = {
  title: "Profile",
  description: "Sign in or create an account to keep your hires.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const acc = await currentAccount();
  if (acc) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Profile</p>
      <h1 className="display-section mt-3 text-white">Your account</h1>
      <p className="lead mt-4">
        Pick one. Sign in if you already have an account. Create an account
        if this is your first time. Guest receipts still open with a claim
        code — no account required.
      </p>

      <div className="mt-8 grid gap-3">
        <Link
          href="/login?mode=login&next=/dashboard"
          className="rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-5 transition hover:border-amber-400/40 hover:bg-white/[0.06]"
        >
          <p className="text-sm font-semibold text-white">Sign in</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
            Email and password, or the wallet you pay with.
          </p>
        </Link>
        <Link
          href="/login?mode=signup&next=/dashboard"
          className="rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] px-5 py-5 transition hover:border-amber-400/60 hover:bg-amber-400/[0.12]"
        >
          <p className="text-sm font-semibold text-amber-100">Create account</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">
            New here. Hires then follow you to any browser.
          </p>
        </Link>
      </div>

      <p className="mt-8 text-[13px] text-white/40">
        <Link href="/browse" className="text-amber-300 hover:underline">
          Hire without an account
        </Link>
        {" · "}
        <Link href="/dashboard" className="text-amber-300 hover:underline">
          Recover a receipt
        </Link>
      </p>
    </div>
  );
}
