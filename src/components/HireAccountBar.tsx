"use client";

import { SignInForm } from "@/components/SignInForm";

export function HireAccountBar({
  onChange,
}: {
  onChange: (signedIn: boolean) => void;
}) {
  return (
    <SignInForm
      onChange={onChange}
      defaultMode="login"
      compact
      title="Keep these hires"
      hint="Sign in or create an account. Then My hires shows the same plans on any browser."
    />
  );
}
