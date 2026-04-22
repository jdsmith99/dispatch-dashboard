"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DigestFile, Category } from "@/lib/types";
import { DigestReader } from "./DigestReader";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Tech": "#a78bfa",
  "Arts & Entertainment": "#f59e0b",
  "VC Investing": "#34d399",
  Ventures: "#60a5fa",
  "Events & Research": "#f87171",
};

interface DigestFeedProps {
  digests: DigestFile[];
  categories: Category[];
  activeCategory?: Category;
  page: number;
  totalPages: number;
}

export function DigestFeed({
  digests,
  categories,
  activeCategory,
  page,
  totalPages,
}: DigestFeedProps) {
  const router = useRouter();
  const [openDigestId, setOpenDigestId] = useState<string | null>(null);

  function setCategory(cat?: Category) {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    params.set("page", "1");
    router.push(`/digests?${params.toString()}`);
  }

  function setPage(p: number) {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    params.set("page", String(p));
    router.push(`/digests?${params.toString()}`);
  }

  return (
    <>
      <div className="flex flex-col">
        {/* Category filter pills */}
        <div
          className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto shrink-0"
          style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
        >
          <FilterPill
            label="All"
            active={!activeCategory}
            onClick={() => setCategory(undefined)}
          />
          {categories.map((cat) => (
            <FilterPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              color={CATEGORY_COLORS[cat]}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>

        {/* Digest list */}
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {digests.length === 0 && (
            <div
              className="flex items-center justify-center h-40 text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              No digests found
            </div>
          )}
          {digests.map((digest) => (
            <DigestCard
              key={digest.id}
              digest={digest}
              onRead={() => setOpenDigestId(digest.id)}
            />
          ))}
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
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
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
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
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
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors"
      style={{
        backgroundColor: active
          ? color
            ? `${color}20`
            : "rgba(255,255,255,0.1)"
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

function DigestCard({
  digest,
  onRead,
}: {
  digest: DigestFile;
  onRead: () => void;
}) {
  const catColor = CATEGORY_COLORS[digest.category] ?? "#6b7280";

  return (
    <div
      className="flex items-start justify-between gap-4 px-5 py-3.5 group transition-colors"
      style={{ backgroundColor: "var(--bg)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--surface)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--bg)")
      }
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
        className="shrink-0 text-xs px-3 py-1.5 rounded-md transition-colors self-start"
        style={{
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        Read
      </button>
    </div>
  );
}
