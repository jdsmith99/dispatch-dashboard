"use client";

import { useState } from "react";
import type { TaskWithDigests } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { TaskDetailPanel } from "./TaskDetailPanel";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function getTodayDayIndex(): number {
  // Returns 0=Mon … 6=Sun (matching DAYS array)
  const dow = new Date().getDay(); // 0=Sun...6=Sat
  return dow === 0 ? 6 : dow - 1;
}

interface WeeklyGridProps {
  tasks: TaskWithDigests[];
}

export function WeeklyGrid({ tasks }: WeeklyGridProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithDigests | null>(null);
  const todayIdx = getTodayDayIndex();
  const [openDays, setOpenDays] = useState<Set<number>>(() => new Set([todayIdx]));

  const scheduledTasks = tasks.filter((t) => t.cronExpression);

  const tasksByDay: TaskWithDigests[][] = DAYS.map((_, idx) => {
    const dayIdx = idx === 6 ? 0 : idx + 1; // Mon=1…Sun=0
    return scheduledTasks.filter((t) => {
      if (isMonthly(t.cronExpression!)) return false;
      const days = getTaskDaysOfWeek(t.cronExpression!);
      return days.includes(dayIdx);
    });
  });

  const monthlyTasks = scheduledTasks.filter(
    (t) => t.cronExpression && isMonthly(t.cronExpression)
  );

  function toggleDay(idx: number) {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // Day labels for mobile (full name)
  const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="p-3 md:p-5">
      {/* ── Desktop: 7-column grid ── */}
      <div
        className="hidden md:block rounded-xl overflow-hidden"
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
          {DAYS.map((day, idx) => (
            <div
              key={day}
              className="px-3 py-2 text-center text-xs font-medium"
              style={{
                color: idx === todayIdx ? "#fff" : "var(--text-faint)",
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
                <TaskCell key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: vertical day list ── */}
      <div className="md:hidden flex flex-col gap-1">
        {DAYS.map((day, idx) => {
          const dayTasks = tasksByDay[idx];
          const isToday = idx === todayIdx;
          const isOpen = openDays.has(idx);

          return (
            <div
              key={day}
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(isOpen ? var(--border) : var(--border-subtle))" }}
            >
              {/* Day header — tappable */}
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
                style={{
                  backgroundColor: isOpen
                    ? "var(--surface)"
                    : isToday
                    ? "rgba(94,106,210,0.08)"
                    : "var(--surface)",
                  borderBottom: isOpen ? "1px solid var(--border)" : undefined,
                }}
                onClick={() => toggleDay(idx)}
              >
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span
                      className="rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isToday ? "#fff" : "var(--text-muted)" }}
                  >
                    {DAY_FULL[idx]}
                    {isToday && (
                      <span
                        className="ml-1.5 text-xs font-normal"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Today
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                    {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                  </span>
                  <ChevronIcon open={isOpen} />
                </div>
              </button>

              {/* Task rows */}
              {isOpen && (
                <div style={{ backgroundColor: "var(--bg)" }}>
                  {dayTasks.length === 0 ? (
                    <p
                      className="px-3 py-3 text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      No tasks scheduled
                    </p>
                  ) : (
                    dayTasks.map((task, tIdx) => (
                      <MobileTaskRow
                        key={task.id}
                        task={task}
                        last={tIdx === dayTasks.length - 1}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly tasks */}
      {monthlyTasks.length > 0 && (
        <div className="mt-4">
          <p
            className="text-xs mb-2 font-medium"
            style={{
              color: "var(--text-faint)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Monthly
          </p>
          {/* Desktop: flex wrap chips */}
          <div className="hidden md:flex flex-wrap gap-2">
            {monthlyTasks.map((task) => (
              <TaskCell key={task.id} task={task} onClick={() => setSelectedTask(task)} compact />
            ))}
          </div>
          {/* Mobile: stacked rows */}
          <div className="md:hidden flex flex-col gap-1.5">
            {monthlyTasks.map((task, idx) => (
              <MobileTaskRow
                key={task.id}
                task={task}
                last={idx === monthlyTasks.length - 1}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
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
      className="w-full text-left rounded-md px-2 py-1.5 flex items-start gap-1.5 transition-colors"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
      title={`${task.name} — ${label}`}
    >
      <span className={`shrink-0 rounded-full mt-1 ${color}`} style={{ width: 6, height: 6 }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-tight truncate" style={{ color: "#e2e2e5", fontSize: "11px" }}>
          {task.name}
        </p>
        {!compact && (
          <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
            {formatTime(task.cronExpression!)}
          </p>
        )}
      </div>
      {task.digestCount > 0 && (
        <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {task.digestCount}
        </span>
      )}
    </button>
  );
}

function MobileTaskRow({
  task,
  last,
  onClick,
}: {
  task: TaskWithDigests;
  last: boolean;
  onClick: () => void;
}) {
  const status = getRunStatus(task);
  const color = getStatusColor(status);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
      style={{ borderBottom: last ? undefined : "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <span className={`shrink-0 rounded-full ${color}`} style={{ width: 7, height: 7 }} />
      <span className="flex-1 text-xs font-medium truncate" style={{ color: "#e2e2e5" }}>
        {task.name}
      </span>
      <span className="shrink-0 text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
        {formatTime(task.cronExpression!)}
      </span>
      {task.digestCount > 0 && (
        <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {task.digestCount}
        </span>
      )}
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{
        transition: "transform 0.2s ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        color: "var(--text-faint)",
        flexShrink: 0,
      }}
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
