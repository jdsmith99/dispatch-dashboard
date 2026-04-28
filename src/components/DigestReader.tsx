"use client";

import { useState, useEffect, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DigestWithContent } from "@/lib/types";
import { getDigestContentAction } from "@/lib/actions";

interface DigestReaderProps {
  digestId: string;
  /** Full ordered list of IDs — enables prev/next navigation */
  allDigestIds?: string[];
  onClose: () => void;
}

function estimateReadTime(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200));
}

export function DigestReader({ digestId, allDigestIds, onClose }: DigestReaderProps) {
  const [currentId, setCurrentId] = useState(digestId);
  const [digest, setDigest] = useState<DigestWithContent | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ids = allDigestIds ?? [digestId];
  const currentIndex = ids.indexOf(currentId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < ids.length - 1;

  useEffect(() => {
    setDigest(null);
    setError(null);
    startTransition(async () => {
      try {
        const data = await getDigestContentAction(currentId);
        setDigest(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    });
  }, [currentId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowLeft" && hasPrev) setCurrentId(ids[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext) setCurrentId(ids[currentIndex + 1]);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, hasPrev, hasNext, currentIndex, ids]);

  const readTime = digest ? estimateReadTime(digest.content) : null;

  const header = (
    <div
      className="flex items-center gap-2 px-4 md:px-5 py-3 shrink-0"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Prev / Next */}
      {ids.length > 1 && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => hasPrev && setCurrentId(ids[currentIndex - 1])}
            disabled={!hasPrev}
            className="flex items-center justify-center rounded"
            style={{
              width: 26, height: 26,
              color: hasPrev ? "var(--text-muted)" : "var(--text-faint)",
              border: "1px solid var(--border)",
              opacity: hasPrev ? 1 : 0.35,
            }}
            title="Previous (←)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 2L3.5 5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => hasNext && setCurrentId(ids[currentIndex + 1])}
            disabled={!hasNext}
            className="flex items-center justify-center rounded"
            style={{
              width: 26, height: 26,
              color: hasNext ? "var(--text-muted)" : "var(--text-faint)",
              border: "1px solid var(--border)",
              opacity: hasNext ? 1 : 0.35,
            }}
            title="Next (→)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {digest ? (
          <>
            <span className="text-sm font-medium truncate" style={{ color: "#fff" }}>
              {digest.taskName}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {digest.fileName}
              {" · "}
              {new Date(digest.date).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
              {readTime != null && ` · ~${readTime} min read`}
              {ids.length > 1 && (
                <span style={{ color: "var(--text-faint)" }}>
                  {" · "}{currentIndex + 1} / {ids.length}
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <div className="skeleton rounded" style={{ height: 14, width: 140 }} />
            <div className="skeleton rounded mt-1" style={{ height: 11, width: 220 }} />
          </>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 flex items-center justify-center rounded-md ml-1 text-xs"
        style={{ width: 32, height: 32, color: "var(--text-muted)", border: "1px solid var(--border)" }}
      >
        ✕
      </button>
    </div>
  );

  const body = (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
      {isPending && (
        <div className="flex flex-col gap-3 pt-1">
          {[100, 82, 91, 66, 87, 73, 95, 78].map((w, i) => (
            <div key={i} className="skeleton rounded" style={{ height: 13, width: `${w}%` }} />
          ))}
          <div className="mt-3 flex flex-col gap-2.5">
            {[76, 88, 62, 80].map((w, i) => (
              <div key={i} className="skeleton rounded" style={{ height: 13, width: `${w}%` }} />
            ))}
          </div>
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      {digest && !isPending && (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{digest.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: full-screen */}
      <div
        className="md:hidden fixed inset-0 z-50 flex flex-col overflow-hidden"
        style={{ backgroundColor: "var(--surface-raised)" }}
      >
        {header}
        {body}
      </div>

      {/* Desktop: backdrop + centered modal */}
      <div
        className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-2xl rounded-xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--surface-raised)",
            border: "1px solid var(--border)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            maxHeight: "85vh",
          }}
        >
          {header}
          {body}
        </div>
      </div>
    </>
  );
}
