"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DigestFile, Category } from "@/lib/types";
import { DigestReader } from "./DigestReader";
import { CategoryBadge, CATEGORY_COLORS } from "./CategoryBadge";
import { runTaskNow } from "@/lib/actions";

const PAGE_SIZE = 50;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Returns the ISO timestamp of the last time the user visited the page.
 *  Updates the stored value on each mount so current digests become "seen"
 *  on the next visit. Returns null on first visit (nothing is "new" yet). */
function useUnreadCutoff(): string | null {
  const [cutoff, setCutoff] = useState<string | null>(null);
  useEffect(() => {
    try {
      const prev = localStorage.getItem("dispatch_last_seen");
      setCutoff(prev);
      localStorage.setItem("dispatch_last_seen", new Date().toISOString());
    } catch {
      // localStorage unavailable (private browsing, etc.) — silently skip
    }
  }, []);
  return cutoff;
}

/** Persists the selected category filter across page refreshes via sessionStorage. */
function usePersistentCategory(): [Category | null, (c: Category | null) => void] {
  const [cat, setCat] = useState<Category | null>(null);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("dispatch_cat");
      if (stored) setCat(stored as Category);
    } catch {}
  }, []);

  function setCategory(c: Category | null) {
    setCat(c);
    try {
      if (c) sessionStorage.setItem("dispatch_cat", c);
      else sessionStorage.removeItem("dispatch_cat");
    } catch {}
  }
  return [cat, setCategory];
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DigestFeedProps {
  digests: DigestFile[];
  categories: Category[];
  activeTaskId?: string;
  activeTaskName?: string;
}

export function DigestFeed({ digests, categories, activeTaskId, activeTaskName }: DigestFeedProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = usePersistentCategory();
  const [openDigestId, setOpenDigestId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const unreadCutoff = useUnreadCutoff();

  function handleCategorySelect(cat: Category | null) {
    setSelectedCategory(cat);
    setPage(1);
  }

  const filtered = selectedCategory
    ? digests.filter((d) => d.category === selectedCategory)
    : digests;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Count digests per category for badge labels
  const categoryCounts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = digests.filter((d) => d.category === cat).length;
    return acc;
  }, {});

  function isNew(digest: DigestFile): boolean {
    if (!unreadCutoff) return false;
    return digest.date > unreadCutoff;
  }

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
                count={digests.length}
                active={selectedCategory === null}
                onClick={() => handleCategorySelect(null)}
              />
              {categories.map((cat) => (
                <FilterPill
                  key={cat}
                  label={cat}
                  count={categoryCounts[cat] ?? 0}
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
                isNew={isNew(digest)}
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
              <span className="ml-1" style={{ color: "var(--text-faint)", opacity: 0.6 }}>
                ({filtered.length} digests)
              </span>
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
        <DigestReader
          digestId={openDigestId}
          allDigestIds={filtered.map((d) => d.id)}
          onClose={() => setOpenDigestId(null)}
        />
      )}
    </>
  );
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
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
      <span
        className="tabular-nums"
        style={{
          fontSize: "10px",
          color: active ? (color ? `${color}cc` : "rgba(255,255,255,0.5)") : "var(--text-faint)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── DigestCard ───────────────────────────────────────────────────────────────

function DigestCard({
  digest,
  isNew,
  onRead,
}: {
  digest: DigestFile;
  isNew: boolean;
  onRead: () => void;
}) {
  return (
    <button
      onClick={onRead}
      className="w-full text-left flex items-start gap-3 px-3 md:px-5 py-3.5 transition-colors hover:brightness-110"
      style={{
        backgroundColor: "var(--bg)",
        borderBottom: "1px solid var(--border-subtle)",
        borderLeft: isNew ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
      }}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isNew && (
            <span
              className="rounded-full shrink-0"
              style={{ width: 6, height: 6, backgroundColor: "var(--accent)" }}
              title="New since last visit"
            />
          )}
          <span className="text-xs font-medium" style={{ color: "#fff" }}>
            {digest.taskName}
          </span>
          <CategoryBadge category={digest.category} />
          <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
            {new Date(digest.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {digest.preview || digest.fileName}
        </p>
      </div>
      <span
        className="shrink-0 text-xs px-3 py-1.5 rounded-md self-start"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
      >
        Read
      </span>
    </button>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

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
