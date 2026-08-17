import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="section-label">404</p>
      <h1 className="display-section mt-3 text-white">Page not found</h1>
      <p className="body mt-4">
        That route doesn’t exist. Start from the judge path or marketplace home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/judge" className="btn-primary">
          Judge path
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
        <Link href="/hire" className="btn-ghost text-white/60">
          Buy agents
        </Link>
      </div>
    </div>
  );
}
