"use server";

import { searchDigests, getDigestContent } from "./digests";
import { getDb } from "./db";
import type { DigestFile, DigestWithContent } from "./types";

/** Mark a digest as read (cross-device). Idempotent: re-opening a digest keeps
 *  its original read_at. The feed updates optimistically on the client, so no
 *  cache revalidation is needed here — force-dynamic pages re-query on the next
 *  navigation. */
export async function markDigestRead(id: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO read_state (digest_id, read_at) VALUES (?, ?)
          ON CONFLICT(digest_id) DO NOTHING`,
    args: [id, new Date().toISOString()],
  });
}

export async function runTaskNow(taskId: string): Promise<{ message: string }> {
  return {
    message: `Manual trigger for "${taskId}" not yet wired. Use the Claude scheduled tasks interface to run manually.`,
  };
}

export async function searchDigestsAction(query: string): Promise<DigestFile[]> {
  return searchDigests(query);
}

export async function getDigestContentAction(
  id: string
): Promise<DigestWithContent | null> {
  return getDigestContent(id);
}
