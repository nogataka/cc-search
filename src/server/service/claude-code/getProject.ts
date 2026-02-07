import { stat } from "node:fs/promises";
import {
  decodeProjectId,
  encodeProjectId,
  readProjectPathFromIndex,
} from "./projectId";
import { getSessionFiles } from "./sessionFiles";
import type { ClaudeCodeProject } from "./types";

export const getClaudeCodeProject = async (
  projectId: string,
): Promise<{
  project: ClaudeCodeProject | null;
}> => {
  try {
    const fullPath = decodeProjectId(projectId);
    const fileStat = await stat(fullPath);

    if (!fileStat.isDirectory()) {
      return { project: null };
    }

    // Get session files to compute meta
    const sessionFiles = await getSessionFiles(fullPath);
    const projectPath = await readProjectPathFromIndex(fullPath);

    const project: ClaudeCodeProject = {
      id: encodeProjectId(fullPath),
      projectPath,
      claudeProjectPath: fullPath,
      lastModifiedAt: fileStat.mtime,
      meta: {
        sessionCount: sessionFiles.length,
        lastSessionDate: sessionFiles[0]?.lastModifiedAt ?? null,
      },
    };

    return { project };
  } catch {
    return { project: null };
  }
};
