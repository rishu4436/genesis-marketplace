import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";
import { RecoverHireBox } from "@/components/RecoverHireBox";

export const metadata = {
  title: "Create account",
  description:
    "Create an account so the agents you hire follow you to any browser.",
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
  const defaultMode = mode === "login" ? "login" : "signup";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Account</p>
      <h1 className="display-section mt-3 text-white">
        Keep the agents you hire
      </h1>
      <p className="lead mt-4">
        Create an account (email or wallet). My hires then shows every plan on
        any phone. Guest hires stay on this browser unless you save them.
      </p>

      <div className="mt-8 space-y-4">
        <SignInForm
          redirectTo={redirectTo}
          defaultMode={defaultMode}
          title={defaultMode === "signup" ? "Create account" : "Sign in"}
          hint="Email + password, or pick the wallet you use to pay. Lost password? Sign in with that wallet."
        />
        <RecoverHireBox />
      </div>

      <p className="mt-8 text-[13px] text-white/40">
        Already hired as a guest? Paste the claim code above, then create an
        account so it sticks.{" "}
        <Link href="/hire" className="text-amber-300 hover:underline">
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
