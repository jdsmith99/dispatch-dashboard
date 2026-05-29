import type { RunStatus, TaskConfig } from "./types";

/**
 * Derives a task's run-status badge. Pure and dependency-free so it can run in
 * client components. Relies on `lastRunAt` being the newest digest's date and
 * `nextRunAt` being the next cron fire time (both populated server-side in
 * loadTasksWithDigests).
 */
export function getRunStatus(task: TaskConfig): RunStatus {
  if (!task.cronExpression) return "manual";

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Produced a digest since midnight → up to date.
  if (task.lastRunAt && new Date(task.lastRunAt) >= todayStart) {
    return "ran-today";
  }

  // Hasn't run today. If it was scheduled to run today and that time has
  // already passed, it's overdue; otherwise it's simply still scheduled.
  if (isScheduledToday(task.cronExpression, now)) {
    const scheduled = scheduledTimeToday(task.cronExpression, now);
    if (scheduled && now >= scheduled) return "overdue";
    return "not-yet";
  }

  return "not-yet";
}

function isScheduledToday(cronExpression: string, now: Date): boolean {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return false;
  const [, , dom, , dow] = parts;

  if (dow !== "*") {
    const days = dow.split(",").map(Number);
    if (!days.includes(now.getDay())) return false;
  }
  if (dom !== "*") {
    if (parseInt(dom, 10) !== now.getDate()) return false;
  }
  return true;
}

/** Today's scheduled run time from simple numeric minute/hour cron fields. */
function scheduledTimeToday(cronExpression: string, now: Date): Date | null {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return null;
  const m = parseInt(parts[0], 10);
  const h = parseInt(parts[1], 10);
  if (Number.isNaN(m) || Number.isNaN(h)) return null;
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

export function getStatusColor(status: RunStatus): string {
  switch (status) {
    case "ran-today":
      return "bg-emerald-500";
    case "overdue":
      return "bg-red-500";
    case "not-yet":
      return "bg-zinc-500";
    case "manual":
      return "bg-zinc-700";
  }
}

export function getStatusLabel(status: RunStatus): string {
  switch (status) {
    case "ran-today":
      return "Ran today";
    case "overdue":
      return "Overdue";
    case "not-yet":
      return "Scheduled";
    case "manual":
      return "Manual";
  }
}
