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
      title="Sign in to keep your hires"
      hint="Email or wallet. Then My hires shows the same plans on any browser. You can still recover a single receipt with a claim code."
    />
  );
}
