"use client";

import { useState, useTransition, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { DigestFile, Category } from "@/lib/types";
import { DigestReader } from "./DigestReader";
import { CategoryBadge, CATEGORY_COLORS } from "./CategoryBadge";
import { runTaskNow, markDigestRead } from "@/lib/actions";

const PAGE_SIZE = 50;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Subscribe that never fires — for snapshots that only change within the same
 *  render pass (no external source to listen to). */
const noopSubscribe = () => () => {};

/** False during SSR + first hydration render, true afterwards. Lets us defer
 *  client-only rendering without a setState-in-effect. */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const CAT_KEY = "dispatch_cat";
const catListeners = new Set<() => void>();

function readStoredCategory(): Category | null {
  try {
    return (sessionStorage.getItem(CAT_KEY) as Category | null) ?? null;
  } catch {
    return null;
  }
}

function subscribeCategory(onChange: () => void): () => void {
  catListeners.add(onChange);
  return () => {
    catListeners.delete(onChange);
  };
}

/** Persists the selected category filter across page refreshes via sessionStorage.
 *  Exposed through useSyncExternalStore so the stored value is read without a
 *  setState-in-effect; the server snapshot is always null and React reconciles to
 *  the client value after hydration (no mismatch). */
function usePersistentCategory(): [Category | null, (c: Category | null) => void] {
  const cat = useSyncExternalStore(subscribeCategory, readStoredCategory, () => null);

  const setCategory = useCallback((c: Category | null) => {
    try {
      if (c) sessionStorage.setItem(CAT_KEY, c);
      else sessionStorage.removeItem(CAT_KEY);
    } catch {}
    catListeners.forEach((l) => l());
  }, []);

  return [cat, setCategory];
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DigestFeedProps {
  digests: DigestFile[];
  categories: Category[];
  /** IDs of digests the user has already opened (cross-device read state). */
  readDigestIds: string[];
  activeTaskId?: string;
  activeTaskName?: string;
}

export function DigestFeed({
  digests,
  categories,
  readDigestIds,
  activeTaskId,
  activeTaskName,
}: DigestFeedProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = usePersistentCategory();
  const [openDigestId, setOpenDigestId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  // Read state is known at SSR time (passed from the server), so unread dots are
  // deterministic on first paint — no hydration dance. We track opened digests
  // optimistically so the dot clears instantly when a reader opens.
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(readDigestIds));

  // Stable identity (empty deps) so DigestReader's load effect can depend on it
  // without re-running. The functional updater guards against duplicate writes;
  // markDigestRead is idempotent regardless.
  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      void markDigestRead(id); // optimistic + idempotent server write
      return new Set(prev).add(id);
    });
  }, []);

  function openDigest(id: string) {
    setOpenDigestId(id);
    markRead(id);
  }
  // Date-group labels ("Today"/"Yesterday") depend on the viewer's clock/timezone,
  // so we render a flat list on the server + first paint and group after mount to
  // avoid hydration mismatches.
  const mounted = useIsClient();

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
    return !readIds.has(digest.id);
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
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid rgba(79,70,229,0.3)",
              }}
            >
              <span
                className="rounded-full shrink-0"
                style={{ width: 5, height: 5, backgroundColor: "var(--accent)" }}
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
        <div className="flex flex-col">
          {paginated.length === 0 ? (
            <EmptyState taskId={activeTaskId} taskName={activeTaskName} />
          ) : mounted ? (
            groupByDate(paginated).map((group) => (
              <div key={group.label}>
                <div className="px-3 md:px-5 pt-5 pb-1.5">
                  <span
                    className="font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-faint)", fontSize: "10px", letterSpacing: "0.1em" }}
                  >
                    {group.label}
                  </span>
                </div>
                {group.items.map((digest) => (
                  <DigestCard
                    key={digest.id}
                    digest={digest}
                    isNew={isNew(digest)}
                    onRead={() => openDigest(digest.id)}
                  />
                ))}
              </div>
            ))
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
          onView={markRead}
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
          ? color ? `${color}20` : "var(--accent-soft)"
          : "transparent",
        color: active ? (color ?? "var(--accent)") : "var(--text-muted)",
        border: active
          ? `1px solid ${color ? `${color}40` : "rgba(79,70,229,0.3)"}`
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
          color: active ? (color ? `${color}cc` : "var(--accent)") : "var(--text-faint)",
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
      className="group w-full text-left flex items-start gap-3 px-3 md:px-5 py-4 transition-colors"
      style={{
        backgroundColor: "transparent",
        borderBottom: "1px solid var(--border-subtle)",
        borderLeft: isNew ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isNew && (
            <span
              className="rounded-full shrink-0"
              style={{ width: 6, height: 6, backgroundColor: "var(--accent)" }}
              title="Unread"
            />
          )}
          <span
            className="font-semibold"
            style={{ color: "var(--text-strong)", fontFamily: "var(--font-serif)", fontSize: "15px" }}
          >
            {digest.taskName}
          </span>
          <CategoryBadge category={digest.category} />
          <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "11px" }}>
            {new Date(digest.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <p
          className="line-clamp-2"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)", fontSize: "14px", lineHeight: 1.55 }}
        >
          {digest.preview || digest.fileName}
        </p>
      </div>
      <span
        className="shrink-0 text-xs px-3 py-1.5 rounded-md self-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--accent)", border: "1px solid rgba(79,70,229,0.3)" }}
      >
        Read →
      </span>
    </button>
  );
}

// ─── Date grouping ──────────────────────────────────────────────────────────

function groupByDate(digests: DigestFile[]): { label: string; items: DigestFile[] }[] {
  const groups: { label: string; items: DigestFile[] }[] = [];
  const byLabel = new Map<string, DigestFile[]>();
  for (const d of digests) {
    const label = dateGroupLabel(d.date);
    let bucket = byLabel.get(label);
    if (!bucket) {
      bucket = [];
      byLabel.set(label, bucket);
      groups.push({ label, items: bucket });
    }
    bucket.push(d);
  }
  return groups;
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
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
          style={{ width: 40, height: 40, backgroundColor: "var(--surface-sunken)" }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-faint)" }}>
            <path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-strong)" }}>
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
