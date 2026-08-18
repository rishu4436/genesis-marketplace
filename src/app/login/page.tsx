import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";
import { RecoverHireBox } from "@/components/RecoverHireBox";

export const metadata = {
  title: "Sign in",
  description:
    "Sign in with email or wallet to recover the agents you hired on another browser.",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const redirectTo =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Account</p>
      <h1 className="display-section mt-3 text-white">
        Recover the agents you hired
      </h1>
      <p className="lead mt-4">
        Sign in with the same email or wallet. My hires shows every plan saved
        to that account — even if you closed the other browser.
      </p>

      <div className="mt-8 space-y-4">
        <SignInForm
          redirectTo={redirectTo}
          title="Sign in"
          hint="Email + password, or the wallet you paid with. New here? Create an account first, then hire so the plan follows you."
        />
        <RecoverHireBox />
      </div>

      <p className="mt-8 text-[13px] text-white/40">
        Guest hires stay on that device unless you sign in or keep the claim
        code.{" "}
        <Link href="/hire" className="text-amber-300 hover:underline">
          Hire an agent
        </Link>
        {" · "}
        <Link href="/dashboard" className="text-amber-300 hover:underline">
          My hires
        </Link>
      </p>
    </div>
  );
}
