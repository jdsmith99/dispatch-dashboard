import { loadTasksWithDigests } from "@/lib/tasks";
import { TaskList } from "@/components/TaskList";
import { SummaryBar } from "@/components/SummaryBar";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await loadTasksWithDigests();
  const scheduled = tasks.filter((t) => t.cronExpression).length;
  const manual = tasks.length - scheduled;

  return (
    <div className="flex flex-col">
      <SummaryBar
        stats={[
          { label: "total tasks", value: tasks.length },
          { label: "scheduled", value: scheduled },
          { label: "manual", value: manual },
        ]}
      />
      <TaskList tasks={tasks} />
    </div>
  );
}
