"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskWithDigests } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { TaskDetailPanel } from "./TaskDetailPanel";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

function getTodayIndex(): number {
  const dow = new Date().getDay();
  return dow === 0 ? 6 : dow - 1;
}

interface WeeklyGridProps {
  tasks: TaskWithDigests[];
}

export function WeeklyGrid({ tasks }: WeeklyGridProps) {
  const router = useRouter();
  const [detailTask, setDetailTask] = useState<TaskWithDigests | null>(null);
  const [todayIdx] = useState<number>(() => getTodayIndex());
  const [openDay, setOpenDay] = useState<number>(() => getTodayIndex());

  const scheduledTasks = tasks.filter((t) => t.cronExpression);

  const tasksByDay: TaskWithDigests[][] = DAYS.map((_, idx) => {
    const cronDow = idx === 6 ? 0 : idx + 1;
    return scheduledTasks.filter((t) => {
      if (isMonthly(t.cronExpression!)) return false;
      return getTaskDaysOfWeek(t.cronExpression!).includes(cronDow);
    });
  });

  const monthlyTasks = scheduledTasks.filter(
    (t) => t.cronExpression && isMonthly(t.cronExpression)
  );

  function toggleDay(idx: number) {
    setOpenDay((prev) => (prev === idx ? -1 : idx));
  }

  function goToDigests(task: TaskWithDigests) {
    router.push(`/digests?task=${encodeURIComponent(task.id)}`);
  }

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
          {DAYS.map((day, idx) => {
            const isToday = idx === todayIdx;
            return (
              <div
                key={day}
                className="px-3 py-2 text-center relative"
                style={{
                  color: isToday ? "var(--accent)" : "var(--text-faint)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: isToday ? 700 : 500,
                  borderLeft: isToday ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {day}
                {isToday && (
                  <span
                    className="block mx-auto mt-0.5 rounded-full"
                    style={{ width: 4, height: 4, backgroundColor: "var(--accent)" }}
                  />
                )}
              </div>
            );
          })}
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
          {tasksByDay.map((dayTasks, idx) => {
            const isToday = idx === todayIdx;
            return (
              <div
                key={idx}
                className="p-2 flex flex-col gap-1"
                style={{
                  borderRight: idx < 6 ? "1px solid var(--border-subtle)" : undefined,
                  borderLeft: isToday ? "2px solid var(--accent)" : "2px solid transparent",
                  backgroundColor: isToday ? "rgba(94,106,210,0.04)" : undefined,
                  minHeight: 80,
                }}
              >
                {dayTasks.map((task) => (
                  <TaskCell
                    key={task.id}
                    task={task}
                    onClick={() => goToDigests(task)}
                    onInfo={(e) => { e.stopPropagation(); setDetailTask(task); }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: vertical day list ── */}
      <div className="md:hidden flex flex-col gap-1">
        {DAYS.map((day, idx) => {
          const dayTasks = tasksByDay[idx];
          const isToday = idx === todayIdx;
          const isOpen = openDay === idx;

          return (
            <div
              key={day}
              className="rounded-lg overflow-hidden"
              style={{
                border: `1px solid ${isToday || isOpen ? "var(--border)" : "var(--border-subtle)"}`,
                boxShadow: isToday && !isOpen ? "inset 2px 0 0 var(--accent)" : undefined,
              }}
            >
              <button
                className="w-full flex items-center justify-between px-3 py-2.5"
                style={{
                  backgroundColor:
                    isToday && !isOpen ? "rgba(94,106,210,0.08)" : "var(--surface)",
                  borderBottom: isOpen ? "1px solid var(--border)" : undefined,
                }}
                onClick={() => toggleDay(idx)}
              >
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span
                      className="rounded-full shrink-0"
                      style={{ width: 6, height: 6, backgroundColor: "var(--accent)" }}
                    />
                  )}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isToday ? "#fff" : "var(--text-muted)" }}
                  >
                    {DAY_FULL[idx]}
                    {isToday && (
                      <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--text-faint)" }}>
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

              {isOpen && (
                <div style={{ backgroundColor: "var(--bg)" }}>
                  {dayTasks.length === 0 ? (
                    <p className="px-3 py-3 text-xs" style={{ color: "var(--text-faint)" }}>
                      No tasks scheduled
                    </p>
                  ) : (
                    dayTasks.map((task, tIdx) => (
                      <MobileTaskRow
                        key={task.id}
                        task={task}
                        last={tIdx === dayTasks.length - 1}
                        onClick={() => goToDigests(task)}
                        onInfo={() => setDetailTask(task)}
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
            style={{ color: "var(--text-faint)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Monthly
          </p>
          <div className="hidden md:flex flex-wrap gap-2">
            {monthlyTasks.map((task) => (
              <TaskCell
                key={task.id}
                task={task}
                compact
                onClick={() => goToDigests(task)}
                onInfo={(e) => { e.stopPropagation(); setDetailTask(task); }}
              />
            ))}
          </div>
          <div className="md:hidden flex flex-col gap-1.5">
            {monthlyTasks.map((task, idx) => (
              <MobileTaskRow
                key={task.id}
                task={task}
                last={idx === monthlyTasks.length - 1}
                onClick={() => goToDigests(task)}
                onInfo={() => setDetailTask(task)}
              />
            ))}
          </div>
        </div>
      )}

      {detailTask && (
        <TaskDetailPanel task={detailTask} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}

interface TaskCellProps {
  task: TaskWithDigests;
  onClick: () => void;
  onInfo: (e: React.MouseEvent) => void;
  compact?: boolean;
}

function TaskCell({ task, onClick, onInfo, compact }: TaskCellProps) {
  const status = getRunStatus(task);
  const color = getStatusColor(status);

  return (
    <div className="relative group w-full">
      <button
        onClick={onClick}
        className="w-full text-left rounded-md px-2 py-1.5 flex items-start gap-1.5"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-subtle)" }}
        title={`${task.name} — view digests`}
      >
        <span className={`shrink-0 rounded-full mt-1 ${color}`} style={{ width: 6, height: 6 }} />
        <div className="min-w-0 flex-1 pr-4">
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
      <button
        onClick={onInfo}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded"
        style={{ width: 16, height: 16, backgroundColor: "rgba(255,255,255,0.1)", color: "var(--text-faint)" }}
        title={`${task.name} — details`}
      >
        <InfoIcon size={9} />
      </button>
    </div>
  );
}

function MobileTaskRow({
  task,
  last,
  onClick,
  onInfo,
}: {
  task: TaskWithDigests;
  last: boolean;
  onClick: () => void;
  onInfo: () => void;
}) {
  const status = getRunStatus(task);
  const color = getStatusColor(status);

  return (
    <div
      className="flex items-center"
      style={{ borderBottom: last ? undefined : "1px solid var(--border-subtle)" }}
    >
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left min-w-0"
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
      <button
        onClick={onInfo}
        className="shrink-0 flex items-center justify-center px-2"
        style={{ height: "100%", color: "var(--text-faint)", minHeight: 40 }}
        title="Task details"
      >
        <InfoIcon size={12} />
      </button>
    </div>
  );
}

function InfoIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 5.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="6" cy="3.5" r="0.6" fill="currentColor" />
    </svg>
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
