"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { searchDigestsAction } from "@/lib/actions";
import type { DigestFile } from "@/lib/types";
import { DigestReader } from "./DigestReader";
import { CategoryBadge } from "./CategoryBadge";

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DigestFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<DigestFile | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Reset focus when the results set changes — adjusted during render (no effect)
  // per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevResults, setPrevResults] = useState(results);
  if (prevResults !== results) {
    setPrevResults(results);
    setFocusedIndex(-1);
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !resultsRef.current) return;
    const items = resultsRef.current.querySelectorAll<HTMLElement>("[data-result-item]");
    items[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        setFocusedIndex((i) => {
          if (i >= 0 && results[i]) setSelected(results[i]);
          return i;
        });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, results]);

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

  const hasResults = results.length > 0;
  const showPrompt = query.trim().length < 2;
  const showEmpty = !showPrompt && !isPending && !hasResults;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ backgroundColor: "rgba(30,26,20,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--surface-raised)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Search input row */}
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
          {isPending ? (
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>Searching…</span>
          ) : hasResults ? (
            <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          ) : null}
          <button
            onClick={onClose}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto" ref={resultsRef}>
          {showPrompt && (
            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-faint)" }}>
              Type at least 2 characters to search
            </div>
          )}
          {showEmpty && (
            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {results.map((r, i) => {
            const focused = i === focusedIndex;
            return (
              <button
                key={r.id}
                data-result-item
                onClick={() => setSelected(r)}
                onMouseEnter={() => setFocusedIndex(i)}
                className="w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor: focused ? "var(--accent-soft)" : "transparent",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text-strong)", fontFamily: "var(--font-serif)" }}>
                      {r.taskName}
                    </span>
                    <CategoryBadge category={r.category} />
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>
                    {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {r.preview}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer hint when results are showing */}
        {hasResults && (
          <div
            className="flex items-center gap-3 px-4 py-2"
            style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
              ↑↓ navigate · Enter to open · Esc to close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
