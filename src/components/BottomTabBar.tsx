"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Grid", icon: GridIcon },
  { href: "/digests", label: "Digests", icon: FileIcon },
  { href: "/tasks", label: "Tasks", icon: ListIcon },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 flex items-stretch"
      style={{
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        height: 56,
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center flex-1 gap-1 transition-colors"
            style={{ color: active ? "#fff" : "var(--text-faint)" }}
          >
            <Icon size={18} active={active} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function GridIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect
        x="2" y="2" width="5" height="5" rx="1"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <rect
        x="9" y="2" width="5" height="5" rx="1"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <rect
        x="2" y="9" width="5" height="5" rx="1"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      <rect
        x="9" y="9" width="5" height="5" rx="1"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function FileIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M9 2v3h3" stroke="currentColor" strokeWidth={active ? 1.6 : 1.2} />
      <path
        d="M5.5 8.5h5M5.5 11h3"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7"
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}
