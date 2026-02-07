import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

// Check if a file is a regular session file (UUID.jsonl)
// Excludes agent-*.jsonl files
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

export const isRegularSessionFile = (filename: string): boolean => {
  return UUID_REGEX.test(filename);
};

export type SessionFileInfo = {
  sessionId: string;
  filePath: string;
  lastModifiedAt: Date;
};

export const getSessionFiles = async (
  projectPath: string,
): Promise<SessionFileInfo[]> => {
  try {
    const entries = await readdir(projectPath);

    const sessionFiles = await Promise.all(
      entries.filter(isRegularSessionFile).map(async (entry) => {
        const filePath = resolve(projectPath, entry);
        const sessionId = entry.replace(".jsonl", "");

        try {
          const fileStat = await stat(filePath);
          return {
            sessionId,
            filePath,
            lastModifiedAt: fileStat.mtime,
          };
        } catch {
          return null;
        }
      }),
    );

    return sessionFiles
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  } catch {
    return [];
  }
};
