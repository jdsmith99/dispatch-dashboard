"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { SearchModal } from "./SearchModal";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/digests": "Digests",
  "/tasks": "Tasks",
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const title = PAGE_TITLES[pathname] ?? "Dispatch";

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <>
      <header
        className="flex items-center justify-between px-5 shrink-0"
        style={{
          height: 44,
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "#fff" }}>
          {title}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Search digests (⌘K)"
          >
            <SearchIcon size={13} />
            <span>Search</span>
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{
              width: 28,
              height: 28,
              color: "var(--text-muted)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Refresh data"
          >
            <RefreshIcon size={13} spinning={refreshing} />
          </button>
        </div>
      </header>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon({ size = 16, spinning }: { size?: number; spinning?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transition: "transform 0.6s ease",
        transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
      }}
    >
      <path
        d="M14 8a6 6 0 11-1.5-4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M10.5 4H14V0.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
