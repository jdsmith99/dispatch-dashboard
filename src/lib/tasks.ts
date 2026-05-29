import "server-only";
import { CronExpressionParser } from "cron-parser";
import { getDb } from "./db";
import tasksData from "../../config/tasks.json";
import type {
  TaskConfig,
  TaskWithDigests,
  TasksFile,
  Category,
  DigestFile,
} from "./types";

// Static config bundled at build time — no filesystem read at request time, so
// this works on Vercel. The path fields (outputFolder/filePattern/filePrefix)
// are only consumed by the sync script; the app ignores them.
const tasksFile = tasksData as unknown as TasksFile;

export function loadTaskConfigs(): TaskConfig[] {
  return tasksFile.tasks;
}

/** Next scheduled fire time, computed from the cron expression. null for manual tasks. */
function computeNextRun(cronExpression: string | null): string | null {
  if (!cronExpression) return null;
  try {
    return CronExpressionParser.parse(cronExpression).next().toISOString();
  } catch {
    return null;
  }
}

function rowToDigest(row: Record<string, unknown>): DigestFile {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    taskId: row.task_id as string,
    taskName: row.task_name as string,
    category: row.category as Category,
    date: row.digest_date as string,
    preview: row.preview as string,
  };
}

export async function loadTasksWithDigests(): Promise<TaskWithDigests[]> {
  const db = getDb();
  const configs = loadTaskConfigs();

  // Per-task digest count + most-recent date (lastRunAt is derived from this).
  const stats = await db.execute(
    "SELECT task_id, COUNT(*) AS n, MAX(digest_date) AS last FROM digests GROUP BY task_id"
  );
  const statByTask = new Map<string, { count: number; last: string | null }>();
  for (const r of stats.rows) {
    statByTask.set(r.task_id as string, {
      count: Number(r.n),
      last: (r.last as string | null) ?? null,
    });
  }

  // Top 3 most-recent digests per task, in a single windowed query.
  const recent = await db.execute(
    `SELECT id, file_name, file_path, task_id, task_name, category, digest_date, preview
     FROM (
       SELECT *, row_number() OVER (PARTITION BY task_id ORDER BY digest_date DESC) AS rn
       FROM digests
     )
     WHERE rn <= 3
     ORDER BY task_id, digest_date DESC`
  );
  const recentByTask = new Map<string, DigestFile[]>();
  for (const r of recent.rows) {
    const taskId = r.task_id as string;
    const list = recentByTask.get(taskId) ?? [];
    list.push(rowToDigest(r));
    recentByTask.set(taskId, list);
  }

  return configs.map((task) => {
    const stat = statByTask.get(task.id);
    return {
      ...task,
      lastRunAt: stat?.last ?? null, // derived: newest digest for this task
      nextRunAt: computeNextRun(task.cronExpression), // derived: from cron
      digestCount: stat?.count ?? 0,
      recentDigests: recentByTask.get(task.id) ?? [],
    };
  });
}

export async function loadSingleTask(taskId: string): Promise<TaskWithDigests | null> {
  const tasks = await loadTasksWithDigests();
  return tasks.find((t) => t.id === taskId) ?? null;
}

export function getCategoryCounts(tasks: TaskConfig[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  return counts;
}
