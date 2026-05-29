import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { BottomTabBar } from "@/components/BottomTabBar";
import { loadTaskConfigs, getCategoryCounts } from "@/lib/tasks";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

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
    <html lang="en" className={`h-full ${inter.variable} ${sourceSerif.variable}`}>
      <body
        className="h-full flex overflow-hidden"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      >
        {/* Sidebar: desktop only */}
        <Sidebar categoryCounts={categoryCounts} totalCount={tasks.length} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          {/* pb-14 on mobile to clear the bottom tab bar */}
          <main className="flex-1 overflow-auto pb-14 md:pb-0">{children}</main>
        </div>

        {/* Bottom tab bar: mobile only */}
        <BottomTabBar />
      </body>
    </html>
  );
}
