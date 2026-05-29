"use client";

import { useState, useTransition, useEffect } from "react";
import type { TaskWithDigests, DigestFile } from "@/lib/types";
import { getRunStatus, getStatusColor, getStatusLabel } from "@/lib/runStatus";
import { runTaskNow } from "@/lib/actions";
import { DigestReader } from "./DigestReader";
import { CategoryBadge } from "./CategoryBadge";

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
    return (
      <DigestReader
        digestId={openDigestId}
        allDigestIds={task.recentDigests.map((d) => d.id)}
        onClose={() => setOpenDigestId(null)}
      />
    );
  }

  const panelContent = (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--text-strong)" }}>
          Task Detail
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded text-xs"
          style={{ width: 28, height: 28, color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Name + status */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold leading-tight" style={{ color: "var(--text-strong)" }}>
            {task.name}
          </h2>
          <div className="flex items-center flex-wrap gap-2">
            <span
              className={`rounded-full ${statusColor}`}
              style={{ width: 7, height: 7, display: "inline-block", flexShrink: 0 }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {statusLabel}
            </span>
            <CategoryBadge category={task.category} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {task.description}
        </p>

        {/* Metadata */}
        <div
          className="rounded-lg p-3 flex flex-col gap-2"
          style={{ backgroundColor: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <MetaRow label="Schedule" value={task.schedule} />
          <MetaRow label="Last run" value={task.lastRunAt ? fmtDate(task.lastRunAt) : "Never"} />
          <MetaRow label="Next run" value={task.nextRunAt ? fmtDate(task.nextRunAt) : "—"} />
          <MetaRow label="Digests" value={String(task.digestCount)} />
        </div>

        {/* 7-day activity sparkline */}
        {task.recentDigests.length > 0 && (
          <div>
            <p
              className="text-xs font-medium mb-2 uppercase tracking-widest"
              style={{ color: "var(--text-faint)", fontSize: "10px" }}
            >
              7-Day Activity
            </p>
            <ActivitySparkline recentDigests={task.recentDigests} />
          </div>
        )}

        {/* Run Now */}
        <div>
          <button
            onClick={handleRunNow}
            disabled={isPending}
            className="w-full py-2 px-3 rounded-md text-xs font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#fff", opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? "Running…" : "Run Now"}
          </button>
          {runMessage && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
                  className="w-full text-left rounded-lg p-2.5 flex flex-col gap-0.5 transition-colors hover:brightness-110"
                  style={{
                    backgroundColor: "var(--surface-raised)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate" style={{ color: "var(--text-strong)" }}>
                      {d.fileName}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>
                      {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {d.preview && (
                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {d.preview}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(30,26,20,0.35)" }}
        onClick={onClose}
      />
      {/* Mobile bottom sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-xl overflow-hidden"
        style={{
          maxHeight: "82vh",
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -16px 40px rgba(30,26,20,0.16)",
        }}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div
            className="rounded-full"
            style={{ width: 32, height: 4, backgroundColor: "var(--border)" }}
          />
        </div>
        {panelContent}
      </div>

      {/* Desktop backdrop */}
      <div
        className="hidden md:block fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(30,26,20,0.35)" }}
        onClick={onClose}
      />
      {/* Desktop right panel */}
      <div
        className="hidden md:flex fixed top-0 right-0 bottom-0 z-40 flex-col overflow-hidden"
        style={{
          width: 360,
          backgroundColor: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-16px 0 40px rgba(30,26,20,0.16)",
        }}
      >
        {panelContent}
      </div>
    </>
  );
}

// ─── ActivitySparkline ────────────────────────────────────────────────────────

function ActivitySparkline({ recentDigests }: { recentDigests: DigestFile[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toDateString();
  });

  const activeDays = new Set(recentDigests.map((d) => new Date(d.date).toDateString()));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-1" style={{ height: 24 }}>
        {days.map((day, i) => {
          const isActive = activeDays.has(day);
          const isToday = i === 6;
          return (
            <div
              key={i}
              title={day}
              className="flex-1 rounded-sm"
              style={{
                height: isActive ? "100%" : "30%",
                backgroundColor: isActive
                  ? "var(--accent)"
                  : isToday
                  ? "var(--accent-soft)"
                  : "var(--surface-sunken)",
                transition: "height 0.2s ease",
              }}
            />
          );
        })}
      </div>
      {/* Day labels */}
      <div className="flex items-center gap-1">
        {days.map((day, i) => {
          const isToday = i === 6;
          const label = new Date(day).toLocaleDateString("en-US", { weekday: "narrow" });
          return (
            <div
              key={i}
              className="flex-1 text-center"
              style={{
                fontSize: "9px",
                color: isToday ? "var(--accent)" : "var(--text-faint)",
                fontWeight: isToday ? 600 : 400,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
