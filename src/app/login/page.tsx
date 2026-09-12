import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";
import { RecoverHireBox } from "@/components/RecoverHireBox";

export const metadata = {
  title: "Sign in",
  description:
    "Sign in or create an account so the agents you hire follow you to any browser.",
};

type Props = {
  searchParams: Promise<{ next?: string; mode?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, mode } = await searchParams;
  const redirectTo =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  const isSignup = mode === "signup" || mode === "create";
  const defaultMode = isSignup ? "signup" : "login";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Account</p>
      <h1 className="display-section mt-3 text-white">
        {defaultMode === "signup" ? "Create account" : "Sign in"}
      </h1>
      <p className="lead mt-4">
        {defaultMode === "signup"
          ? "One account for email or wallet. My hires then shows every plan on any phone. Guest hires stay on this browser until you save them."
          : "Welcome back. Email and password, or the wallet you pay with. Guest receipts still open with a claim code — no account required."}
      </p>

      <div className="mt-8 space-y-4">
        <SignInForm
          redirectTo={redirectTo}
          defaultMode={defaultMode}
          syncUrl
          hideModeSwitch
        />
        <RecoverHireBox />
      </div>

      <p className="mt-8 text-[13px] text-white/40">
        {defaultMode === "signup"
          ? "Already have an account? "
          : "New here? "}
        <Link
          href={
            defaultMode === "signup"
              ? "/login?mode=login"
              : "/login?mode=signup"
          }
          className="text-amber-300 hover:underline"
        >
          {defaultMode === "signup" ? "Sign in" : "Create account"}
        </Link>
        {" · "}
        <Link href="/profile" className="text-amber-300 hover:underline">
          Profile
        </Link>
        {" · "}
        <Link href="/browse" className="text-amber-300 hover:underline">
          Hire
        </Link>
        {" · "}
        <Link href="/dashboard" className="text-amber-300 hover:underline">
          My hires
        </Link>
      </p>
    </div>
  );
}
