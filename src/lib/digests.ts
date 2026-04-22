import path from "path";
import fs from "fs";
import type { Category, DigestFile, DigestWithContent } from "./types";
import { loadTaskConfigs } from "./tasks";

function toBase64UrlId(filePath: string): string {
  return Buffer.from(filePath).toString("base64url");
}

function fromBase64UrlId(id: string): string {
  return Buffer.from(id, "base64url").toString("utf-8");
}

export async function scanFolderForDigests(
  folder: string,
  taskId: string,
  taskName: string,
  category: Category,
  filePattern: string
): Promise<DigestFile[]> {
  const normalizedFolder = path.resolve(folder);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(normalizedFolder, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: DigestFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (filePattern !== "*.md" && !matchesPattern(entry.name, filePattern)) continue;

    const filePath = path.join(normalizedFolder, entry.name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    let preview = "";
    try {
      const handle = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(512);
      fs.readSync(handle, buf, 0, 512, 0);
      fs.closeSync(handle);
      const raw = buf.toString("utf-8").replace(/\0/g, "");
      preview = raw.replace(/^#.*\n?/m, "").replace(/[#*`_\[\]]/g, "").trim().slice(0, 150);
    } catch {
      // locked file — skip preview
    }

    files.push({
      id: toBase64UrlId(filePath),
      fileName: entry.name,
      filePath,
      taskId,
      taskName,
      category,
      date: stat.mtime.toISOString(),
      preview,
    });
  }

  files.sort((a, b) => b.date.localeCompare(a.date));
  return files;
}

export async function getAllDigests(categoryFilter?: Category): Promise<DigestFile[]> {
  const configs = loadTaskConfigs();
  const all: DigestFile[] = [];

  for (const task of configs) {
    if (!task.outputFolder) continue;
    try {
      const digests = await scanFolderForDigests(
        task.outputFolder,
        task.id,
        task.name,
        task.category as Category,
        task.filePattern ?? "*.md"
      );
      all.push(...digests);
    } catch {
      // skip
    }
  }

  const unique = deduplicateByPath(all);
  const filtered = categoryFilter
    ? unique.filter((d) => d.category === categoryFilter)
    : unique;

  filtered.sort((a, b) => b.date.localeCompare(a.date));
  return filtered;
}

function matchesPattern(name: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(name);
}

function deduplicateByPath(digests: DigestFile[]): DigestFile[] {
  const seen = new Set<string>();
  return digests.filter((d) => {
    if (seen.has(d.filePath)) return false;
    seen.add(d.filePath);
    return true;
  });
}

export async function getDigestContent(id: string): Promise<DigestWithContent | null> {
  const filePath = fromBase64UrlId(id);
  const configs = loadTaskConfigs();

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }

  const fileName = path.basename(filePath);
  const folder = path.dirname(filePath);
  const fileNameLower = fileName.toLowerCase();

  // Match by outputFolder first, then fall back to filePrefix
  const matchedTask =
    configs.find((t) => t.outputFolder && path.resolve(t.outputFolder) === folder) ??
    configs.find(
      (t) =>
        t.filePrefix &&
        fileNameLower.startsWith(t.filePrefix.toLowerCase() + "-")
    );

  return {
    id,
    fileName,
    filePath,
    taskId: matchedTask?.id ?? "unknown",
    taskName: matchedTask?.name ?? fileName,
    category: (matchedTask?.category as Category) ?? "AI & Tech",
    date: stat.mtime.toISOString(),
    preview: content.slice(0, 150),
    content,
  };
}

export async function searchDigests(query: string): Promise<DigestFile[]> {
  if (!query.trim()) return [];
  const all = await getAllDigests();
  const lower = query.toLowerCase();
  const results: DigestFile[] = [];

  for (const digest of all) {
    try {
      const content = fs.readFileSync(digest.filePath, "utf-8");
      if (content.toLowerCase().includes(lower)) {
        results.push(digest);
      }
    } catch {
      // locked or gone
    }
  }

  return results;
}
