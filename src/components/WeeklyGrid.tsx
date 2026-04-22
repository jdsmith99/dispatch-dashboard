"use client";

import { useState } from "react";
import type { TaskWithDigests } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { TaskDetailPanel } from "./TaskDetailPanel";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_MAP: Record<string, number[]> = {
  "0 * * * 1": [1],
  "0 * * * 2": [2],
  "0 * * * 3": [3],
  "0 * * * 4": [4],
  "0 * * * 5": [5],
  "0 * * * 6": [6],
  "0 * * * 0": [0],
};

function getTaskDaysOfWeek(cronExpr: string): number[] {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) return [];
  const dow = parts[4];
  if (dow === "*") return [0, 1, 2, 3, 4, 5, 6];
  return dow.split(",").map(Number);
}

function isMonthly(cronExpr: string): boolean {
  const parts = cronExpr.split(" ");
  return parts.length === 5 && parts[2] !== "*";
}

interface WeeklyGridProps {
  tasks: TaskWithDigests[];
}

export function WeeklyGrid({ tasks }: WeeklyGridProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithDigests | null>(null);

  const scheduledTasks = tasks.filter((t) => t.cronExpression);

  // Group tasks by their days for the grid
  const tasksByDay: TaskWithDigests[][] = DAYS.map((_, idx) => {
    const dayIdx = idx === 6 ? 0 : idx + 1; // Mon=1…Sun=0
    return scheduledTasks.filter((t) => {
      if (isMonthly(t.cronExpression!)) return false;
      const days = getTaskDaysOfWeek(t.cronExpression!);
      return days.includes(dayIdx);
    });
  });

  // Monthly tasks shown separately
  const monthlyTasks = scheduledTasks.filter(
    (t) => t.cronExpression && isMonthly(t.cronExpression)
  );

  return (
    <div className="p-5">
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {/* Day headers */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-center text-xs font-medium"
              style={{
                color: "var(--text-faint)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(7, 1fr)",
            backgroundColor: "var(--bg)",
            minHeight: 320,
          }}
        >
          {tasksByDay.map((dayTasks, idx) => (
            <div
              key={idx}
              className="p-2 flex flex-col gap-1"
              style={{
                borderRight: idx < 6 ? "1px solid var(--border-subtle)" : undefined,
                minHeight: 80,
              }}
            >
              {dayTasks.map((task) => (
                <TaskCell
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly tasks */}
      {monthlyTasks.length > 0 && (
        <div className="mt-5">
          <p
            className="text-xs mb-2 font-medium"
            style={{ color: "var(--text-faint)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Monthly
          </p>
          <div className="flex flex-wrap gap-2">
            {monthlyTasks.map((task) => (
              <TaskCell
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

interface TaskCellProps {
  task: TaskWithDigests;
  onClick: () => void;
  compact?: boolean;
}

function TaskCell({ task, onClick, compact }: TaskCellProps) {
  const status = getRunStatus(task);
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md px-2 py-1.5 flex items-start gap-1.5 group transition-colors"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-subtle)")
      }
      title={`${task.name} — ${label}`}
    >
      <span
        className={`shrink-0 rounded-full mt-1 ${color}`}
        style={{ width: 6, height: 6 }}
      />
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-medium leading-tight truncate"
          style={{ color: "#e2e2e5", fontSize: "11px" }}
        >
          {task.name}
        </p>
        {!compact && (
          <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
            {formatTime(task.cronExpression!)}
          </p>
        )}
      </div>
      {task.digestCount > 0 && (
        <span
          className="shrink-0 text-xs tabular-nums"
          style={{ color: "var(--text-faint)", fontSize: "10px" }}
        >
          {task.digestCount}
        </span>
      )}
    </button>
  );
}

function formatTime(cronExpr: string): string {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) return "";
  const [min, hr] = parts;
  const h = parseInt(hr);
  const m = parseInt(min);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
