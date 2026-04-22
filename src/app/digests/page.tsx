import { getAllDigests } from "@/lib/digests";
import type { Category } from "@/lib/types";
import { DigestFeed } from "@/components/DigestFeed";
import { SummaryBar } from "@/components/SummaryBar";

export const dynamic = "force-dynamic";

interface DigestsPageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

export default async function DigestsPage({ searchParams }: DigestsPageProps) {
  const params = await searchParams;
  const categoryFilter = params.category as Category | undefined;

  const allDigests = await getAllDigests();
  const filtered = categoryFilter
    ? allDigests.filter((d) => d.category === categoryFilter)
    : allDigests;

  const categories = [...new Set(allDigests.map((d) => d.category))].sort();

  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex flex-col">
      <SummaryBar
        stats={[
          { label: "total digests", value: allDigests.length },
          { label: "showing", value: filtered.length },
          { label: "page", value: page },
        ]}
      />
      <DigestFeed
        digests={paginated}
        categories={categories}
        activeCategory={categoryFilter}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
