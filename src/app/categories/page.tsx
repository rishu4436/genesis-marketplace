import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES } from "@/lib/categories";

export const metadata = {
  title: "Categories",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Categories
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Hackathon bar: all four categories first-class, equal depth — rebalancing,
        grid trading, yield optimisation, and health-factor monitoring.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>
    </div>
  );
}
