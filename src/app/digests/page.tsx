import { getAllDigests } from "@/lib/digests";
import { loadTaskConfigs } from "@/lib/tasks";
import type { Category } from "@/lib/types";
import { DigestFeed } from "@/components/DigestFeed";
import { SummaryBar } from "@/components/SummaryBar";

export const dynamic = "force-dynamic";

interface DigestsPageProps {
  searchParams: Promise<{ category?: string; task?: string; page?: string }>;
}

export default async function DigestsPage({ searchParams }: DigestsPageProps) {
  const params = await searchParams;
  const categoryFilter = params.category as Category | undefined;
  const taskFilter = params.task;

  const allDigests = await getAllDigests();

  let filtered = allDigests;
  if (taskFilter) {
    filtered = allDigests.filter((d) => d.taskId === taskFilter);
  } else if (categoryFilter) {
    filtered = allDigests.filter((d) => d.category === categoryFilter);
  }

  const categories = [...new Set(allDigests.map((d) => d.category))].sort() as Category[];

  let activeTaskName: string | undefined;
  if (taskFilter) {
    const configs = loadTaskConfigs();
    activeTaskName = configs.find((t) => t.id === taskFilter)?.name ?? taskFilter;
  }

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
        activeTaskId={taskFilter}
        activeTaskName={activeTaskName}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
