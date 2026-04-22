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
  /** Human-readable schedule description */
  schedule: string;
  /** Cron expression. null for manual-only tasks */
  cronExpression: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  /** Absolute path to the folder where Dispatch writes output files. null for manual tasks */
  outputFolder: string | null;
  /** Glob pattern to match this task's files within outputFolder (e.g. "AIN-*.md") */
  filePattern: string | null;
  /** Uppercase prefix Dispatch uses in filenames for this task (e.g. "AIN").
   *  Used to attribute files when scanning shared folders. */
  filePrefix: string | null;
}

export interface TaskWithDigests extends TaskConfig {
  digestCount: number;
  recentDigests: DigestFile[];
}

export interface DigestFile {
  id: string; // base64url of absolute file path
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

/** Shape of config/tasks.json */
export interface TasksFile {
  _schema?: Record<string, string>;
  tasks: TaskConfig[];
}

export type RunStatus = "ran-today" | "overdue" | "not-yet" | "manual";
