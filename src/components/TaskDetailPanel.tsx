"use client";

import { useState, useTransition, useEffect } from "react";
import type { TaskWithDigests } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { runTaskNow } from "@/lib/actions";
import { DigestReader } from "./DigestReader";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Tech": "#a78bfa",
  "Arts & Entertainment": "#f59e0b",
  "VC Investing": "#34d399",
  Ventures: "#60a5fa",
  "Events & Research": "#f87171",
};

interface TaskDetailPanelProps {
  task: TaskWithDigests;
  onClose: () => void;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openDigestId, setOpenDigestId] = useState<string | null>(null);

  const status = getRunStatus(task);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const catColor = CATEGORY_COLORS[task.category] ?? "#6b7280";

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleRunNow() {
    startTransition(async () => {
      const res = await runTaskNow(task.id);
      setRunMessage(res.message);
    });
  }

  if (openDigestId) {
    return <DigestReader digestId={openDigestId} onClose={() => setOpenDigestId(null)} />;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="ml-auto h-full flex flex-col overflow-hidden"
        style={{
          width: 360,
          backgroundColor: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-16px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-xs font-medium" style={{ color: "#fff" }}>
            Task Detail
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded text-xs"
            style={{
              width: 24,
              height: 24,
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            ✕
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Task name + status */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold leading-tight" style={{ color: "#fff" }}>
              {task.name}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full ${statusColor}`}
                style={{ width: 7, height: 7, display: "inline-block" }}
              />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {statusLabel}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${catColor}20`,
                  color: catColor,
                  border: `1px solid ${catColor}40`,
                }}
              >
                {task.category}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {task.description}
          </p>

          {/* Metadata rows */}
          <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{ backgroundColor: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <MetaRow label="Schedule" value={task.schedule} />
            <MetaRow
              label="Last run"
              value={task.lastRunAt ? fmtDate(task.lastRunAt) : "Never"}
            />
            <MetaRow
              label="Next run"
              value={task.nextRunAt ? fmtDate(task.nextRunAt) : "—"}
            />
            <MetaRow label="Digests" value={String(task.digestCount)} />
          </div>

          {/* Run Now button */}
          <div>
            <button
              onClick={handleRunNow}
              disabled={isPending}
              className="w-full py-1.5 px-3 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: "var(--accent)",
                color: "#fff",
                opacity: isPending ? 0.6 : 1,
              }}
              onMouseEnter={(e) =>
                !isPending && (e.currentTarget.style.backgroundColor = "var(--accent-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--accent)")
              }
            >
              {isPending ? "Running…" : "Run Now"}
            </button>
            {runMessage && (
              <p
                className="text-xs mt-2 leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {runMessage}
              </p>
            )}
          </div>

          {/* Recent digests */}
          {task.recentDigests.length > 0 && (
            <div>
              <p
                className="text-xs font-medium mb-2 uppercase tracking-widest"
                style={{ color: "var(--text-faint)", fontSize: "10px" }}
              >
                Recent Digests
              </p>
              <div className="flex flex-col gap-1.5">
                {task.recentDigests.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setOpenDigestId(d.id)}
                    className="w-full text-left rounded-lg p-2.5 flex flex-col gap-0.5 transition-colors"
                    style={{
                      backgroundColor: "var(--surface-raised)",
                      border: "1px solid var(--border-subtle)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border-subtle)")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate" style={{ color: "#fff" }}>
                        {d.fileName}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>
                        {new Date(d.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {d.preview && (
                      <p
                        className="text-xs line-clamp-2 leading-relaxed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {d.preview}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>
        {label}
      </span>
      <span className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
        {value}
      </span>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
