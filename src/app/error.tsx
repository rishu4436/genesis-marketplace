"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="section-label">Something went wrong</p>
      <h1 className="display-section mt-3 text-white">Page error</h1>
      <p className="body mt-4 text-white/55">
        {error.message || "Unexpected error. Try again or return home."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/judge" className="btn-secondary">
          Judge path
        </Link>
        <Link href="/" className="btn-ghost text-white/60">
          Home
        </Link>
      </div>
    </div>
  );
}
