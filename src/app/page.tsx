import { loadTasksWithDigests } from "@/lib/tasks";
import { WeeklyGrid } from "@/components/WeeklyGrid";
import { SummaryBar } from "@/components/SummaryBar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tasks = await loadTasksWithDigests();

  const scheduled = tasks.filter((t) => t.cronExpression);
  const ranToday = tasks.filter((t) => {
    if (!t.lastRunAt) return false;
    const today = new Date();
    const last = new Date(t.lastRunAt);
    return last.toDateString() === today.toDateString();
  }).length;
  const totalDigests = tasks.reduce((sum, t) => sum + t.digestCount, 0);

  return (
    <div className="flex flex-col">
      <SummaryBar
        stats={[
          { label: "Scheduled tasks", value: scheduled.length },
          { label: "Manual tasks", value: tasks.length - scheduled.length },
          { label: "Ran today", value: ranToday },
          { label: "Total digests", value: totalDigests },
        ]}
      />
      <WeeklyGrid tasks={tasks} />
    </div>
  );
}
