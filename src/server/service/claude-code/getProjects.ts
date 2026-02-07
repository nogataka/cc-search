import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { claudeCodeProjectsRootPath } from "../paths";
import { encodeProjectId, readProjectPathFromIndex } from "./projectId";
import { getSessionFiles } from "./sessionFiles";
import type { ClaudeCodeProject } from "./types";

export const getClaudeCodeProjects = async (): Promise<{
  projects: ClaudeCodeProject[];
}> => {
  try {
    const entries = await readdir(claudeCodeProjectsRootPath);

    const projects = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = resolve(claudeCodeProjectsRootPath, entry);

        try {
          const fileStat = await stat(fullPath);

          if (!fileStat.isDirectory()) {
            return null;
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

          return project;
        } catch {
          return null;
        }
      }),
    );

    const validProjects = projects.filter(
      (p): p is ClaudeCodeProject => p !== null,
    );

    // Sort by last modified date (newest first)
    validProjects.sort(
      (a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime(),
    );

    return { projects: validProjects };
  } catch {
    return { projects: [] };
  }
};
