import "server-only";
import { getDb } from "./db";
import type { Category, DigestFile, DigestWithContent } from "./types";

// Columns that make up a DigestFile (no content — kept lean for list views).
const DIGEST_COLS =
  "id, file_name, file_path, task_id, task_name, category, digest_date, preview";

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

export async function getAllDigests(categoryFilter?: Category): Promise<DigestFile[]> {
  const db = getDb();
  const result = categoryFilter
    ? await db.execute({
        sql: `SELECT ${DIGEST_COLS} FROM digests WHERE category = ? ORDER BY digest_date DESC`,
        args: [categoryFilter],
      })
    : await db.execute(`SELECT ${DIGEST_COLS} FROM digests ORDER BY digest_date DESC`);
  return result.rows.map(rowToDigest);
}

export async function getDigestContent(id: string): Promise<DigestWithContent | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT ${DIGEST_COLS}, content FROM digests WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { ...rowToDigest(row), content: row.content as string };
}

/** IDs of every digest the user has opened at least once (cross-device read
 *  state, keyed by digest id). The feed treats any digest NOT in this set as
 *  unread. Small result set — one short id per opened digest. */
export async function getReadDigestIds(): Promise<string[]> {
  const db = getDb();
  const result = await db.execute(`SELECT digest_id FROM read_state`);
  return result.rows.map((row) => row.digest_id as string);
}

export async function searchDigests(query: string): Promise<DigestFile[]> {
  // Tokenize on whitespace; quoting each term neutralises FTS5 syntax chars,
  // and a trailing "*" makes each a prefix match for typeahead-style search.
  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/"/g, ""))
    .filter(Boolean);
  if (terms.length === 0) return [];
  const match = terms.map((t) => `"${t}"*`).join(" ");

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT d.id, d.file_name, d.file_path, d.task_id, d.task_name,
                 d.category, d.digest_date, d.preview
          FROM digests_fts f
          JOIN digests d ON d.rowid = f.rowid
          WHERE digests_fts MATCH ?
          ORDER BY rank
          LIMIT 100`,
    args: [match],
  });
  return result.rows.map(rowToDigest);
}
