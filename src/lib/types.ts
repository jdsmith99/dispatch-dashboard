export type Category =
  | "Arts & Entertainment"
  | "AI & Tech"
  | "VC Investing"
  | "Ventures"
  | "Events & Research";

export interface TaskConfig {
  id: string;
  name: string;
  description: string;
  category: Category;
  schedule: string;
  cronExpression: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  outputFolder: string | null;
  filePattern: string | null;
}

export interface TaskWithDigests extends TaskConfig {
  digestCount: number;
  recentDigests: DigestFile[];
}

export interface DigestFile {
  id: string; // base64url of file path
  fileName: string;
  filePath: string;
  taskId: string;
  taskName: string;
  category: Category;
  date: string; // ISO date string from mtime
  preview: string;
}

export interface DigestWithContent extends DigestFile {
  content: string;
}

export type RunStatus = "ran-today" | "overdue" | "not-yet" | "manual";
