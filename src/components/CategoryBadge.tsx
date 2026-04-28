export const CATEGORY_COLORS: Record<string, string> = {
  "AI & Tech": "#a78bfa",
  "Arts & Entertainment": "#f59e0b",
  "VC Investing": "#34d399",
  Ventures: "#60a5fa",
  "Events & Research": "#f87171",
};

export function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? "#6b7280";
  return (
    <span
      className="shrink-0 text-xs px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        fontSize: "10px",
      }}
    >
      {category}
    </span>
  );
}
