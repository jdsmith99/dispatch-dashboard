"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CATEGORY_COLORS: Record<string, string> = {
  "AI & Tech": "#a78bfa",
  "Arts & Entertainment": "#f59e0b",
  "VC Investing": "#34d399",
  Ventures: "#60a5fa",
  "Events & Research": "#f87171",
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/digests", label: "Digests", icon: FileIcon },
  { href: "/tasks", label: "Tasks", icon: ListIcon },
];

interface SidebarProps {
  categoryCounts: Record<string, number>;
  totalCount: number;
}

export function Sidebar({ categoryCounts, totalCount }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 h-full overflow-y-auto"
      style={{
        width: 200,
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <DispatchIcon />
        <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-strong)" }}>
          Dispatch
        </span>
      </div>

      {/* Nav */}
      <nav className="px-2 py-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--text-muted)",
                backgroundColor: active ? "var(--accent-soft)" : "transparent",
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Categories */}
      <div className="px-4 pt-4 pb-2">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-2"
          style={{ color: "var(--text-faint)", fontSize: "10px" }}
        >
          Categories
        </p>
        <div className="flex flex-col gap-1">
          {Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="shrink-0 rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: CATEGORY_COLORS[cat] ?? "#6b7280",
                    }}
                  />
                  <span
                    className="truncate text-xs"
                    style={{ color: "var(--text-muted)", fontSize: "11px" }}
                  >
                    {cat}
                  </span>
                </div>
                <span
                  className="text-xs tabular-nums shrink-0 ml-1"
                  style={{ color: "var(--text-faint)", fontSize: "10px" }}
                >
                  {count}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {totalCount} tasks configured
        </p>
      </div>
    </aside>
  );
}

function DispatchIcon() {
  return (
    <div
      className="flex items-center justify-center rounded"
      style={{ width: 20, height: 20, backgroundColor: "var(--accent)" }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 2h6M2 5h4M2 8h5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function GridIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function FileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5.5 8.5h5M5.5 11h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
