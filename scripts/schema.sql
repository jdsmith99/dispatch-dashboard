-- Dispatch dashboard schema (Turso / libSQL).
-- Applied by scripts/migrate.mjs. Safe to re-run (everything is IF NOT EXISTS).

-- One row per digest markdown file. `content` holds the full markdown; it's small.
CREATE TABLE IF NOT EXISTS digests (
  id           TEXT PRIMARY KEY,   -- base64url of the original absolute path (stable id, matches the old scheme)
  task_id      TEXT NOT NULL,
  task_name    TEXT NOT NULL,
  category     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,      -- original local path, kept for provenance only
  digest_date  TEXT NOT NULL,      -- ISO timestamp from file mtime
  preview      TEXT NOT NULL,
  content      TEXT NOT NULL,
  content_hash TEXT NOT NULL,      -- lets the sync job skip unchanged files
  synced_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digests_task ON digests(task_id);
CREATE INDEX IF NOT EXISTS idx_digests_date ON digests(digest_date);
CREATE INDEX IF NOT EXISTS idx_digests_category ON digests(category);

-- Full-text search index over digest content. External-content FTS5: the index
-- mirrors the `digests` table and is kept in sync by the triggers below.
CREATE VIRTUAL TABLE IF NOT EXISTS digests_fts USING fts5(
  content,
  task_name,
  category,
  content='digests',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS digests_ai AFTER INSERT ON digests BEGIN
  INSERT INTO digests_fts(rowid, content, task_name, category)
  VALUES (new.rowid, new.content, new.task_name, new.category);
END;

CREATE TRIGGER IF NOT EXISTS digests_ad AFTER DELETE ON digests BEGIN
  INSERT INTO digests_fts(digests_fts, rowid, content, task_name, category)
  VALUES ('delete', old.rowid, old.content, old.task_name, old.category);
END;

CREATE TRIGGER IF NOT EXISTS digests_au AFTER UPDATE ON digests BEGIN
  INSERT INTO digests_fts(digests_fts, rowid, content, task_name, category)
  VALUES ('delete', old.rowid, old.content, old.task_name, old.category);
  INSERT INTO digests_fts(rowid, content, task_name, category)
  VALUES (new.rowid, new.content, new.task_name, new.category);
END;

-- Cross-device read state (replaces the per-browser localStorage "last seen").
CREATE TABLE IF NOT EXISTS read_state (
  digest_id TEXT PRIMARY KEY,
  read_at   TEXT NOT NULL
);
