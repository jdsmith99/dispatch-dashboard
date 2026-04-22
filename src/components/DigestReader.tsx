"use client";

import { useState, useEffect, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DigestWithContent } from "@/lib/types";
import { getDigestContentAction } from "@/lib/actions";

interface DigestReaderProps {
  digestId: string;
  onClose: () => void;
}

export function DigestReader({ digestId, onClose }: DigestReaderProps) {
  const [digest, setDigest] = useState<DigestWithContent | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getDigestContentAction(digestId);
        setDigest(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    });
  }, [digestId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
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
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            {digest ? (
              <>
                <span className="text-sm font-medium truncate" style={{ color: "#fff" }}>
                  {digest.taskName}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {digest.fileName} ·{" "}
                  {new Date(digest.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </>
            ) : (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {isPending ? "Loading…" : "Digest"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center rounded-md ml-3 text-xs"
            style={{
              width: 28,
              height: 28,
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isPending && (
            <div
              className="flex items-center justify-center h-32 text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              Loading content…
            </div>
          )}
          {error && <div className="text-xs text-red-400">{error}</div>}
          {digest && !isPending && (
            <div className="prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{digest.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
