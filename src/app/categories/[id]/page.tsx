import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { GenesisAgentCard } from "@/components/GenesisAgentCard";
import { getCategory, CATEGORIES, type CategoryId } from "@/lib/categories";
import { getAgentsForCategory } from "@/lib/category-agents";
import { getGenesisAgentsByCategory } from "@/lib/genesis-agents";
import { getFeaturedSellers } from "@/lib/third-party-sellers";
import { BRAND } from "@/lib/brand";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategoryDepthPanel } from "@/components/CategoryDepthPanel";
import { JobIntentSearch } from "@/components/JobIntentSearch";
import { scoreAllSpecialists } from "@/lib/receipt-score";

export const revalidate = 90;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const cat = getCategory(id);
  return {
    title: cat ? cat.name : "Category",
    description: cat?.description,
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const cat = getCategory(id);
  if (!cat) notFound();

  const page = Math.max(1, Number(sp.page || "1") || 1);
  const pageSize = 24;

  const genesis = getGenesisAgentsByCategory(id as CategoryId);
  const outsiders = getFeaturedSellers(id as CategoryId);
  const scores = await scoreAllSpecialists();
  const fitBySlug = Object.fromEntries(
    scores.map((s) => [s.slug, s.composite]),
  );
  const { hireable, identity, identityTotal, hasMore, error } =
    await getAgentsForCategory(id as CategoryId, {
      page,
      pageSize,
    });

  const browseAllHref = `/browse?q=${encodeURIComponent(cat.searchQueries[0])}`;
  const browseOpenHref = "/browse";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link
        href="/categories"
        className="text-xs font-medium text-white/45 hover:text-amber-300"
      >
        ← All categories
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <CategoryIcon id={cat.id} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {cat.name}
              </h1>
              <p className="mt-0.5 text-sm text-white/45">{cat.tagline}</p>
            </div>
          </div>
          <p className="body mt-4 max-w-xl">{cat.description}</p>
          <p className="body-sm mt-2">
            <span className="font-semibold text-white/55">Agent role: </span>
            {cat.agentDoes}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link href={browseAllHref} className="btn-secondary !py-2 !text-sm">
            Search this job in catalog
          </Link>
          <Link
            href={browseOpenHref}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200"
          >
            Browse catalog →
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <CategoryDepthPanel categoryId={cat.id} />
      </div>

      <div className="mt-6">
        <JobIntentSearch variant="page" />
      </div>

      <div className="panel mt-6 p-4 text-xs text-white/55">
        <p className="font-semibold text-white/80">How to pick on this shelf</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            Need a plan in minutes you execute yourself — buy the{" "}
            {BRAND.byBadge} specialist.
          </li>
          <li>
            Need a live outsider on this job — look for{" "}
            <span className="text-sky-300">Live third-party</span>
            {outsiders.length
              ? ` (${outsiders.map((s) => `${s.name} · #${s.tokenId}`).join("; ")})`
              : ""}
            .
          </li>
          <li>
            Unhireable identities stay on this shelf — marked{" "}
            <span className="font-semibold text-rose-200">Unhireable</span>
            {" "}so you never mistake them for a live hire.
          </li>
        </ul>
      </div>

      {/* Explain density */}
      <div className="panel mt-8 px-4 py-3.5 sm:px-5">
        <p className="text-sm text-white/60">
          <span className="font-semibold text-white/80">This shelf</span>
          {" — "}
          {hireable.length} hireable
          {hireable.length === 1 ? "" : ""} · {identityTotal} unhireable
          identit{identityTotal === 1 ? "y" : "ies"} listed and marked.
        </p>
      </div>

      <div className="mt-10">
        <h2 className="card-title text-xl text-white">
          {BRAND.specialistsTitle}
        </h2>
        <p className="body-sm mt-1.5 max-w-xl">
          {BRAND.byBadge} — {BRAND.specialistLabel.toLowerCase()} for this job.
          Built and operated by the marketplace so you can hire immediately.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {genesis.map((a) => (
            <GenesisAgentCard
              key={a.slug}
              agent={a}
              receiptFit={fitBySlug[a.slug]}
            />
          ))}
        </div>
      </div>

      {hireable.length > 0 && (
        <div className="mt-12">
          <h2 className="card-title text-xl text-white">Hireable on this job</h2>
          <p className="body-sm mt-1">
            Live third-party endpoints we can negotiate · {hireable.length}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hireable.map((a) => (
              <AgentCard
                key={a.id || a.agent_id}
                agent={a}
                categoryId={cat.id}
              />
            ))}
          </div>
        </div>
      )}

      {identity.length > 0 && (
        <div className="mt-12">
          <h2 className="card-title text-xl text-white">
            Unhireable on this job
          </h2>
          <p className="body-sm mt-1">
            On-chain identities with no live hire we can complete ·{" "}
            {identityTotal} listed
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {identity.map((a) => (
              <AgentCard
                key={a.id || a.agent_id}
                agent={a}
                categoryId={cat.id}
              />
            ))}
          </div>
          {(page > 1 || hasMore) && (
            <div className="mt-6 flex justify-center gap-3">
              {page > 1 && (
                <Link
                  href={`/categories/${cat.id}?page=${page - 1}`}
                  className="btn-secondary !py-2 !text-sm"
                >
                  ← Previous
                </Link>
              )}
              {hasMore && (
                <Link
                  href={`/categories/${cat.id}?page=${page + 1}`}
                  className="btn-primary !py-2 !text-sm"
                >
                  More unhireable →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {hireable.length === 0 && identity.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No other listings on this job"
            body={
              error ||
              `The ${BRAND.byBadge} specialist above is still hireable.`
            }
            actionHref="/hire"
            actionLabel="Open hire floor"
          />
        </div>
      )}

      <div className="panel mt-12 p-5">
        <h3 className="text-sm font-semibold text-white">
          Where are the rest of the agents?
        </h3>
        <ul className="body-sm mt-3 list-inside list-disc space-y-1.5">
          <li>
            This page is a <strong className="text-white/70">category shelf</strong>{" "}
            — ranked matches for {cat.shortName}, not the entire chain.
          </li>
          <li>
            BSC has a large ERC-8004 index. Hireable A2A is listed first;
            the rest is marked Unhireable. Use{" "}
            <Link href="/browse" className="text-amber-300 hover:underline">
              Browse
            </Link>{" "}
            to see both across jobs.
          </li>
          <li>
            Only some agents accept hire; {BRAND.byBadge} specialists are always
            hireable in-product.
          </li>
        </ul>
      </div>
    </div>
  );
}
