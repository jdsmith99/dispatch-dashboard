import type { RunStatus, TaskConfig } from "./types";

export function getRunStatus(task: TaskConfig): RunStatus {
  if (!task.cronExpression) return "manual";

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (task.lastRunAt) {
    const last = new Date(task.lastRunAt);
    if (last >= todayStart) return "ran-today";
  }

  if (task.nextRunAt) {
    const next = new Date(task.nextRunAt);
    const dayOfWeek = now.getDay(); // 0=Sun...6=Sat
    const nextDayOfWeek = next.getDay();

    // For weekly tasks: if next run is in the future (hasn't passed), it's "not-yet"
    // If next run was supposed to happen today or earlier but didn't, it's "overdue"
    const scheduledToday = nextDayOfWeek === dayOfWeek || isScheduledToday(task, now);

    if (scheduledToday && !task.lastRunAt) return "not-yet";
    if (next < now && !task.lastRunAt) return "overdue";
    if (next > now) return "not-yet";
  }

  return "not-yet";
}

function isScheduledToday(task: TaskConfig, now: Date): boolean {
  if (!task.cronExpression) return false;
  const expr = task.cronExpression;
  const parts = expr.split(" ");
  if (parts.length !== 5) return false;

  const [, , dom, , dow] = parts;

  // Check day-of-week
  if (dow !== "*") {
    const days = dow.split(",").map(Number);
    if (!days.includes(now.getDay())) return false;
  }

  // Check day-of-month
  if (dom !== "*") {
    if (parseInt(dom) !== now.getDate()) return false;
  }

  return true;
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
