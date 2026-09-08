import Link from "next/link";
import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES } from "@/lib/categories";

export const metadata = {
  title: "Categories",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Marketplace</p>
      <h1 className="display-section mt-3 text-white">Shop by job</h1>
      <p className="lead mt-3 max-w-lg">
        Each job shelf lists hireable A2A first, then unhireable
        identities — clearly marked Unhireable. We do not hide the index.
      </p>

      <p className="section-label mt-10">Job categories</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>

      <p className="body-sm mt-8">
        Looking for something else?{" "}
        <Link
          href="/browse"
          className="font-semibold text-amber-300 hover:text-amber-200"
        >
          Browse catalog
        </Link>{" "}
        or{" "}
        <Link
          href="/browse"
          className="font-semibold text-amber-300 hover:text-amber-200"
        >
          hire a By Genesis specialist
        </Link>
        .
      </p>
    </div>
  );
}
