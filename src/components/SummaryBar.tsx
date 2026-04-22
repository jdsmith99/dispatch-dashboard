interface Stat {
  label: string;
  value: number;
}

export function SummaryBar({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="flex items-center px-5 gap-6 shrink-0"
      style={{
        height: 48,
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#fff" }}>
            {s.value}
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
