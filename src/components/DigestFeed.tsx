"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DigestFile, Category } from "@/lib/types";
import { DigestReader } from "./DigestReader";
import { runTaskNow } from "@/lib/actions";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Tech": "#a78bfa",
  "Arts & Entertainment": "#f59e0b",
  "VC Investing": "#34d399",
  Ventures: "#60a5fa",
  "Events & Research": "#f87171",
};

const PAGE_SIZE = 50;

interface DigestFeedProps {
  digests: DigestFile[];
  categories: Category[];
  activeTaskId?: string;
  activeTaskName?: string;
}

export function DigestFeed({ digests, categories, activeTaskId, activeTaskName }: DigestFeedProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [openDigestId, setOpenDigestId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function handleCategorySelect(cat: Category | null) {
    setSelectedCategory(cat);
    setPage(1);
  }

  const filtered = selectedCategory
    ? digests.filter((d) => d.category === selectedCategory)
    : digests;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="flex flex-col">
        {/* Filter bar */}
        <div
          className="flex items-center gap-1.5 px-3 md:px-5 py-3 overflow-x-auto shrink-0"
          style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
        >
          {activeTaskId ? (
            <button
              onClick={() => router.push("/digests")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
              style={{
                backgroundColor: "rgba(94,106,210,0.15)",
                color: "#a5b4fc",
                border: "1px solid rgba(94,106,210,0.35)",
              }}
            >
              <span
                className="rounded-full shrink-0"
                style={{ width: 5, height: 5, backgroundColor: "#a5b4fc" }}
              />
              {activeTaskName ?? activeTaskId}
              <span className="ml-0.5 opacity-60" style={{ fontSize: "10px" }}>✕</span>
            </button>
          ) : (
            <>
              <FilterPill
                label="All"
                active={selectedCategory === null}
                onClick={() => handleCategorySelect(null)}
              />
              {categories.map((cat) => (
                <FilterPill
                  key={cat}
                  label={cat}
                  active={selectedCategory === cat}
                  color={CATEGORY_COLORS[cat]}
                  onClick={() => handleCategorySelect(cat)}
                />
              ))}
            </>
          )}
        </div>

        {/* Digest list */}
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {paginated.length === 0 ? (
            <EmptyState taskId={activeTaskId} taskName={activeTaskName} />
          ) : (
            paginated.map((digest) => (
              <DigestCard
                key={digest.id}
                digest={digest}
                onRead={() => setOpenDigestId(digest.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{
                color: page <= 1 ? "var(--text-faint)" : "var(--text-muted)",
                border: "1px solid var(--border)",
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              Previous
            </button>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{
                color: page >= totalPages ? "var(--text-faint)" : "var(--text-muted)",
                border: "1px solid var(--border)",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {openDigestId && (
        <DigestReader digestId={openDigestId} onClose={() => setOpenDigestId(null)} />
      )}
    </>
  );
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
      style={{
        backgroundColor: active
          ? color ? `${color}20` : "rgba(255,255,255,0.1)"
          : "transparent",
        color: active ? (color ?? "#fff") : "var(--text-muted)",
        border: active
          ? `1px solid ${color ? `${color}40` : "rgba(255,255,255,0.2)"}`
          : "1px solid var(--border)",
      }}
    >
      {color && (
        <span
          className="rounded-full shrink-0"
          style={{ width: 5, height: 5, backgroundColor: active ? color : "var(--text-faint)" }}
        />
      )}
      {label}
    </button>
  );
}

function DigestCard({ digest, onRead }: { digest: DigestFile; onRead: () => void }) {
  const catColor = CATEGORY_COLORS[digest.category] ?? "#6b7280";

  return (
    <div
      className="flex items-start justify-between gap-3 px-3 md:px-5 py-3.5"
      style={{ backgroundColor: "var(--bg)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: "#fff" }}>
            {digest.taskName}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${catColor}20`,
              color: catColor,
              border: `1px solid ${catColor}40`,
              fontSize: "10px",
            }}
          >
            {digest.category}
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
            {new Date(digest.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {digest.preview || digest.fileName}
        </p>
      </div>
      <button
        onClick={onRead}
        className="shrink-0 text-xs px-3 py-1.5 rounded-md self-start"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
      >
        Read
      </button>
    </div>
  );
}

function EmptyState({ taskId, taskName }: { taskId?: string; taskName?: string }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleRun() {
    if (!taskId) return;
    startTransition(async () => {
      const res = await runTaskNow(taskId);
      setMsg(res.message);
    });
  }

  if (taskId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-faint)" }}>
            <path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium" style={{ color: "#fff" }}>
            No digests yet for {taskName ?? taskId}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            This task hasn&apos;t produced any output files yet.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={isPending}
          className="text-xs px-4 py-2 rounded-md font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff", opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? "Running…" : "Run Now"}
        </button>
        {msg && (
          <p className="text-xs max-w-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {msg}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-40 text-xs" style={{ color: "var(--text-faint)" }}>
      No digests found
    </div>
  );
}
