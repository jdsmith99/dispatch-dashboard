import "server-only";
import { createClient, type Client } from "@libsql/client";

/**
 * Server-only Turso (libSQL) client for the Next.js app.
 *
 * This module imports "server-only" so it can never be pulled into a client
 * bundle — the auth token stays on the server. The sync/migration scripts in
 * scripts/ create their own client instead of importing this (they run in plain
 * Node, outside the RSC bundler, where "server-only" would throw).
 *
 * The client is created lazily so `next build` can evaluate this module without
 * the env vars present; it's only required at request time.
 */
let client: Client | undefined;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL is not set. Add it to .env.local (local) or the Vercel project env (deployed)."
      );
    }
    client = createClient({ url, authToken });
  }
  return client;
}
