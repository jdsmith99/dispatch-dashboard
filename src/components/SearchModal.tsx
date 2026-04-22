"use client";

import { useState, useTransition, useEffect } from "react";
import { searchDigestsAction } from "@/lib/actions";
import type { DigestFile } from "@/lib/types";
import { DigestReader } from "./DigestReader";

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DigestFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<DigestFile | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const res = await searchDigestsAction(value);
      setResults(res);
    });
  }

  if (selected) {
    return (
      <DigestReader
        digestId={selected.id}
        onClose={() => setSelected(null)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--surface-raised)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ borderBottom: "1px solid var(--border)", height: 48 }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search digest content…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text)" }}
          />
          {isPending && (
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              Searching…
            </span>
          )}
          <button
            onClick={onClose}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              color: "var(--text-faint)",
              border: "1px solid var(--border)",
            }}
          >
            Esc
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim().length >= 2 && !isPending && (
            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              No results for "{query}"
            </div>
          )}
          {results.length === 0 && query.trim().length < 2 && (
            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-faint)" }}>
              Type at least 2 characters to search
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium" style={{ color: "#fff" }}>
                  {r.taskName}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>
                  {new Date(r.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
                {r.preview}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
