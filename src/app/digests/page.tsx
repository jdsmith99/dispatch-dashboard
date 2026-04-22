import { getAllDigests } from "@/lib/digests";
import { loadTaskConfigs } from "@/lib/tasks";
import type { Category } from "@/lib/types";
import { DigestFeed } from "@/components/DigestFeed";
import { SummaryBar } from "@/components/SummaryBar";

export const dynamic = "force-dynamic";

interface DigestsPageProps {
  searchParams: Promise<{ task?: string }>;
}

export default async function DigestsPage({ searchParams }: DigestsPageProps) {
  const params = await searchParams;
  const taskFilter = params.task;

  const allDigests = await getAllDigests();
  const categories = [...new Set(allDigests.map((d) => d.category))].sort() as Category[];

  let digests = allDigests;
  let activeTaskName: string | undefined;

  if (taskFilter) {
    digests = allDigests.filter((d) => d.taskId === taskFilter);
    const configs = loadTaskConfigs();
    activeTaskName = configs.find((t) => t.id === taskFilter)?.name ?? taskFilter;
  }

  return (
    <div className="flex flex-col">
      <SummaryBar
        stats={[
          { label: "total digests", value: allDigests.length },
          { label: "showing", value: digests.length },
        ]}
      />
      <DigestFeed
        digests={digests}
        categories={categories}
        activeTaskId={taskFilter}
        activeTaskName={activeTaskName}
      />
    </div>
  );
}
