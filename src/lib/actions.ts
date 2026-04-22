"use server";

import { searchDigests, getDigestContent } from "./digests";
import type { DigestFile, DigestWithContent } from "./types";

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
