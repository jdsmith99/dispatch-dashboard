// Applies scripts/schema.sql to the Turso database.
// Run with:  npm run migrate   (loads .env.local via --env-file)
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("✗ TURSO_DATABASE_URL is not set. Create .env.local from .env.example first.");
  process.exit(1);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(dir, "schema.sql"), "utf-8");

const db = createClient({ url, authToken });

try {
  await db.executeMultiple(schema);
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'digests_fts_%' ORDER BY name"
  );
  console.log("✓ schema applied. Tables:", tables.rows.map((r) => r.name).join(", "));
} catch (err) {
  console.error("✗ migration failed:", err.message);
  process.exit(1);
} finally {
  db.close();
}
