"use client";

import { useState, useTransition } from "react";
import type { TaskWithDigests } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { runTaskNow } from "@/lib/actions";
import { DigestReader } from "./DigestReader";
import { TaskDetailPanel } from "./TaskDetailPanel";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Tech": "#a78bfa",
  "Arts & Entertainment": "#f59e0b",
  "VC Investing": "#34d399",
  Ventures: "#60a5fa",
  "Events & Research": "#f87171",
};

interface TaskListProps {
  tasks: TaskWithDigests[];
}

export function TaskList({ tasks }: TaskListProps) {
  const [openDigestId, setOpenDigestId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithDigests | null>(null);

  const scheduled = tasks.filter((t) => t.cronExpression);
  const manual = tasks.filter((t) => !t.cronExpression);

  return (
    <>
      <div className="p-3 md:p-5 flex flex-col gap-5">
        <Section title="Scheduled" tasks={scheduled} onSelectTask={setSelectedTask} />
        <Section title="Manual" tasks={manual} onSelectTask={setSelectedTask} />
      </div>

      {openDigestId && (
        <DigestReader digestId={openDigestId} onClose={() => setOpenDigestId(null)} />
      )}
      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  );
}

function Section({
  title,
  tasks,
  onSelectTask,
}: {
  title: string;
  tasks: TaskWithDigests[];
  onSelectTask: (t: TaskWithDigests) => void;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-2 mb-2 pb-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--text-faint)", fontSize: "10px" }}
        >
          {title}
        </span>
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-faint)", fontSize: "10px" }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Desktop table */}
      <div
        className="hidden md:block rounded-xl overflow-x-auto"
        style={{ border: "1px solid var(--border)" }}
      >
        <div style={{ minWidth: 680 }}>
          <div
            className="grid text-xs font-medium uppercase tracking-widest px-4 py-2"
            style={{
              gridTemplateColumns: "1fr 130px 160px 110px 110px 60px 80px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text-faint)",
              fontSize: "10px",
            }}
          >
            <span>Name</span>
            <span>Category</span>
            <span>Schedule</span>
            <span>Last run</span>
            <span>Next run</span>
            <span>Digests</span>
            <span></span>
          </div>
          {tasks.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              last={idx === tasks.length - 1}
              onClick={() => onSelectTask(task)}
            />
          ))}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task)} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onClick,
}: {
  task: TaskWithDigests;
  onClick: () => void;
}) {
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = getRunStatus(task);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const catColor = CATEGORY_COLORS[task.category] ?? "#6b7280";

  function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await runTaskNow(task.id);
      setRunMsg(res.message);
      setTimeout(() => setRunMsg(null), 5000);
    });
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2 cursor-pointer"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border-subtle)",
      }}
      onClick={onClick}
    >
      {/* Top row: status dot + name + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 rounded-full ${statusColor}`}
            style={{ width: 7, height: 7 }}
            title={statusLabel}
          />
          <span className="text-xs font-medium truncate" style={{ color: "#fff" }}>
            {task.name}
          </span>
        </div>
        <span
          className="shrink-0 text-xs px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${catColor}20`,
            color: catColor,
            border: `1px solid ${catColor}40`,
            fontSize: "10px",
          }}
        >
          {task.category}
        </span>
      </div>

      {/* Schedule */}
      <p className="text-xs" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
        {task.cronExpression ? task.schedule : "Manual only"}
      </p>

      {/* Bottom row: last run + digest count + run button */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
            Last: {task.lastRunAt ? relativeTime(task.lastRunAt) : "Never"}
          </span>
          {task.digestCount > 0 && (
            <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
              {task.digestCount} digests
            </span>
          )}
        </div>
        {!task.cronExpression && (
          <button
            onClick={handleRun}
            disabled={isPending}
            className="text-xs px-2.5 py-1 rounded-md transition-colors"
            style={{
              color: "#fff",
              backgroundColor: "var(--accent)",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "…" : "Run"}
          </button>
        )}
      </div>
      {runMsg && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {runMsg}
        </p>
      )}
    </div>
  );
}

function TaskRow({
  task,
  last,
  onClick,
}: {
  task: TaskWithDigests;
  last: boolean;
  onClick: () => void;
}) {
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = getRunStatus(task);
  const statusColor = getStatusColor(status);
  const catColor = CATEGORY_COLORS[task.category] ?? "#6b7280";

  function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await runTaskNow(task.id);
      setRunMsg(res.message);
      setTimeout(() => setRunMsg(null), 4000);
    });
  }

  return (
    <div
      className="cursor-pointer transition-colors"
      style={{
        borderBottom: last ? undefined : "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")}
      onClick={onClick}
    >
      <div
        className="grid items-center px-4 py-2.5"
        style={{ gridTemplateColumns: "1fr 130px 160px 110px 110px 60px 80px" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 rounded-full ${statusColor}`}
            style={{ width: 6, height: 6 }}
            title={getStatusLabel(status)}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "#fff" }}>
              {task.name}
            </p>
            {runMsg && (
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                {runMsg}
              </p>
            )}
          </div>
        </div>
        <div>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${catColor}20`,
              color: catColor,
              border: `1px solid ${catColor}40`,
              fontSize: "10px",
            }}
          >
            {task.category}
          </span>
        </div>
        <span className="text-xs truncate" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          {task.cronExpression ? task.schedule : "—"}
        </span>
        <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
          {task.lastRunAt ? relativeTime(task.lastRunAt) : "Never"}
        </span>
        <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
          {task.nextRunAt ? relativeTime(task.nextRunAt) : "—"}
        </span>
        <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
          {task.digestCount > 0 ? task.digestCount : "—"}
        </span>
        <div className="flex justify-end">
          {!task.cronExpression && (
            <button
              onClick={handleRun}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                opacity: isPending ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              }}
            >
              {isPending ? "…" : "Run"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  if (abs < 60_000) return future ? "in moments" : "just now";
  if (abs < 3_600_000) { const m = Math.round(abs / 60_000); return future ? `in ${m}m` : `${m}m ago`; }
  if (abs < 86_400_000) { const h = Math.round(abs / 3_600_000); return future ? `in ${h}h` : `${h}h ago`; }
  const d = Math.round(abs / 86_400_000);
  return future ? `in ${d}d` : `${d}d ago`;
}
