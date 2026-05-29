// Scans the Dispatch output folders defined in config/tasks.json and upserts
// every digest markdown file into Turso. Idempotent: unchanged files (same
// content hash) are skipped. Runs locally where the files live; schedule it on
// a timer (see Phase 5). Run manually with:  npm run sync
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("✗ TURSO_DATABASE_URL is not set. Create .env.local from .env.example first.");
  process.exit(1);
}

const CONFIG_PATH = path.resolve(process.cwd(), "config", "tasks.json");

/** base64url of the absolute path — stable id, matches the dashboard's old scheme. */
function toId(filePath) {
  return Buffer.from(filePath).toString("base64url");
}

/** Glob-ish match: only "*" is special (any run of chars). Mirrors the app's matcher. */
function matchesPattern(name, pattern) {
  if (pattern === "*.md") return name.endsWith(".md");
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(name);
}

/** Strip markdown chrome for a short plain-text preview. */
function makePreview(content) {
  return content
    .replace(/^#.*\n?/m, "")
    .replace(/[#*`_\[\]]/g, "")
    .trim()
    .slice(0, 150);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const { tasks } = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
const db = createClient({ url, authToken });
const syncedAt = new Date().toISOString();

let inserted = 0;
let updated = 0;
let unchanged = 0;
let skippedFolders = 0;

try {
  for (const task of tasks) {
    if (!task.outputFolder) continue;

    const folder = path.resolve(task.outputFolder);
    const pattern = task.filePattern ?? "*.md";

    let entries;
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch {
      console.warn(`  ! skipping "${task.name}" — folder unavailable: ${folder}`);
      skippedFolders++;
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (!matchesPattern(entry.name, pattern)) continue;

      const filePath = path.join(folder, entry.name);
      let content, mtime;
      try {
        content = readFileSync(filePath, "utf-8");
        mtime = statSync(filePath).mtime.toISOString();
      } catch {
        continue; // locked or vanished mid-scan
      }

      const id = toId(filePath);
      const hash = sha256(content);

      const existing = await db.execute({
        sql: "SELECT content_hash FROM digests WHERE id = ?",
        args: [id],
      });

      if (existing.rows.length && existing.rows[0].content_hash === hash) {
        unchanged++;
        continue;
      }

      const wasPresent = existing.rows.length > 0;

      await db.execute({
        sql: `INSERT INTO digests
                (id, task_id, task_name, category, file_name, file_path,
                 digest_date, preview, content, content_hash, synced_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                task_id      = excluded.task_id,
                task_name    = excluded.task_name,
                category     = excluded.category,
                file_name    = excluded.file_name,
                file_path    = excluded.file_path,
                digest_date  = excluded.digest_date,
                preview      = excluded.preview,
                content      = excluded.content,
                content_hash = excluded.content_hash,
                synced_at    = excluded.synced_at`,
        args: [
          id,
          task.id,
          task.name,
          task.category,
          entry.name,
          filePath,
          mtime,
          makePreview(content),
          content,
          hash,
          syncedAt,
        ],
      });

      if (wasPresent) updated++;
      else inserted++;
    }
  }

  const total = await db.execute("SELECT COUNT(*) AS n FROM digests");
  console.log(
    `✓ sync complete — +${inserted} new, ${updated} updated, ${unchanged} unchanged` +
      (skippedFolders ? `, ${skippedFolders} folder(s) unavailable` : "") +
      `. DB now holds ${total.rows[0].n} digests.`
  );
} catch (err) {
  console.error("✗ sync failed:", err.message);
  process.exit(1);
} finally {
  db.close();
}
