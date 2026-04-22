import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { loadTaskConfigs, getCategoryCounts } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Dispatch",
  description: "Scheduled Claude AI task dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tasks = loadTaskConfigs();
  const categoryCounts = getCategoryCounts(tasks);

  return (
    <html lang="en" className="h-full">
      <body
        className="h-full flex overflow-hidden"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      >
        <Sidebar categoryCounts={categoryCounts} totalCount={tasks.length} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
