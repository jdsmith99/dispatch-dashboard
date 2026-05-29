"use client";

import { useState, useTransition } from "react";
import type { TaskWithDigests } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { runTaskNow } from "@/lib/actions";
import { DigestReader } from "./DigestReader";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { CategoryBadge } from "./CategoryBadge";

type SortKey = "name" | "lastRunAt" | "nextRunAt" | "digestCount";
type SortDir = "asc" | "desc";

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

// ─── Section ──────────────────────────────────────────────────────────────────

function sortTasks(tasks: TaskWithDigests[], key: SortKey, dir: SortDir): TaskWithDigests[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    switch (key) {
      case "name":
        return mult * a.name.localeCompare(b.name);
      case "lastRunAt": {
        const at = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
        const bt = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
        return mult * (at - bt);
      }
      case "nextRunAt": {
        const at = a.nextRunAt ? new Date(a.nextRunAt).getTime() : Infinity;
        const bt = b.nextRunAt ? new Date(b.nextRunAt).getTime() : Infinity;
        return mult * (at - bt);
      }
      case "digestCount":
        return mult * (a.digestCount - b.digestCount);
    }
  });
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
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = sortTasks(tasks, sortKey, sortDir);

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
          {/* Column headers */}
          <div
            className="grid px-4 py-2"
            style={{
              gridTemplateColumns: "1fr 130px 160px 110px 110px 60px 80px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            {(
              [
                { key: "name" as SortKey, label: "Name" },
                { key: null, label: "Category" },
                { key: null, label: "Schedule" },
                { key: "lastRunAt" as SortKey, label: "Last run" },
                { key: "nextRunAt" as SortKey, label: "Next run" },
                { key: "digestCount" as SortKey, label: "Digests" },
                { key: null, label: "" },
              ] as { key: SortKey | null; label: string }[]
            ).map(({ key, label }, i) =>
              key ? (
                <button
                  key={i}
                  onClick={() => handleSort(key)}
                  className="flex items-center gap-1 text-left transition-colors"
                  style={{
                    color: sortKey === key ? "var(--text-muted)" : "var(--text-faint)",
                    fontSize: "10px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                  <SortIcon active={sortKey === key} dir={sortDir} />
                </button>
              ) : (
                <span
                  key={i}
                  style={{
                    color: "var(--text-faint)",
                    fontSize: "10px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                </span>
              )
            )}
          </div>

          {sorted.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              last={idx === sorted.length - 1}
              onClick={() => onSelectTask(task)}
            />
          ))}
        </div>
      </div>

      {/* Mobile sort control */}
      <div className="md:hidden flex items-center gap-2 mb-2">
        <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>Sort:</span>
        {(["name", "lastRunAt", "digestCount"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs"
            style={{
              fontSize: "10px",
              color: sortKey === key ? "var(--text-strong)" : "var(--text-faint)",
              backgroundColor: sortKey === key ? "var(--active)" : "transparent",
              border: "1px solid var(--border)",
            }}
          >
            {({ name: "Name", lastRunAt: "Last run", digestCount: "Digests" } as Record<string, string>)[key]}
            {sortKey === key && <SortIcon active dir={sortDir} />}
          </button>
        ))}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-2">
        {sorted.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task)} />
        ))}
      </div>
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: active ? 1 : 0.3 }}>
      {!active || dir === "asc" ? (
        <path d="M4 1.5L6.5 5.5H1.5L4 1.5Z" fill="currentColor" />
      ) : (
        <path d="M4 6.5L1.5 2.5H6.5L4 6.5Z" fill="currentColor" />
      )}
    </svg>
  );
}

// ─── TaskCard (mobile) ────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: TaskWithDigests; onClick: () => void }) {
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = getRunStatus(task);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

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
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-subtle)" }}
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
          <span className="text-xs font-medium truncate" style={{ color: "var(--text-strong)" }}>
            {task.name}
          </span>
        </div>
        <CategoryBadge category={task.category} />
      </div>

      {/* Schedule */}
      <p className="text-xs" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
        {task.cronExpression ? task.schedule : "Manual only"}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-3">
          <span suppressHydrationWarning className="text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
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
            style={{ color: "#fff", backgroundColor: "var(--accent)", opacity: isPending ? 0.6 : 1 }}
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

// ─── TaskRow (desktop) ────────────────────────────────────────────────────────

function TaskRow({ task, last, onClick }: { task: TaskWithDigests; last: boolean; onClick: () => void }) {
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = getRunStatus(task);
  const statusColor = getStatusColor(status);

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
        {/* Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 rounded-full ${statusColor}`}
            style={{ width: 6, height: 6 }}
            title={getStatusLabel(status)}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-strong)" }}>
              {task.name}
            </p>
            {runMsg && (
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                {runMsg}
              </p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <CategoryBadge category={task.category} />
        </div>

        {/* Schedule */}
        <span className="text-xs truncate" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          {task.cronExpression ? task.schedule : "—"}
        </span>

        {/* Last run */}
        <span suppressHydrationWarning className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
          {task.lastRunAt ? relativeTime(task.lastRunAt) : "Never"}
        </span>

        {/* Next run */}
        <span suppressHydrationWarning className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
          {task.nextRunAt ? relativeTime(task.nextRunAt) : "—"}
        </span>

        {/* Digest count */}
        <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
          {task.digestCount > 0 ? task.digestCount : "—"}
        </span>

        {/* Actions */}
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
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-strong)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-faint)";
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

// ─── Utilities ────────────────────────────────────────────────────────────────

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
