import path from "path";
import fs from "fs";
import type { TaskConfig, TaskWithDigests, TasksFile, Category } from "./types";
import { scanFolderForDigests } from "./digests";

const CONFIG_PATH = path.resolve(process.cwd(), "config", "tasks.json");

export function loadTaskConfigs(): TaskConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw) as TasksFile;
  return parsed.tasks;
}

export async function loadTasksWithDigests(): Promise<TaskWithDigests[]> {
  const configs = loadTaskConfigs();
  const results: TaskWithDigests[] = [];

  for (const task of configs) {
    let digestCount = 0;
    let recentDigests: TaskWithDigests["recentDigests"] = [];

    if (task.outputFolder) {
      try {
        const digests = await scanFolderForDigests(
          task.outputFolder,
          task.id,
          task.name,
          task.category as Category,
          task.filePattern ?? "*.md"
        );
        digestCount = digests.length;
        recentDigests = digests.slice(0, 3);
      } catch {
        // folder may be locked or unavailable — skip gracefully
      }
    }

    results.push({ ...task, digestCount, recentDigests });
  }

  return results;
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
