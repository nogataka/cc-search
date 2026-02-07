import {
  getWorkspaceName,
  listSessionsForWorkspace,
} from "../codex/sessionFiles";
import type { ProjectMeta } from "../types";

export const getProjectMeta = async (
  workspacePath: string,
): Promise<ProjectMeta> => {
  const sessions = await listSessionsForWorkspace(workspacePath);

  const lastSessionAt = sessions.reduce<Date | null>((acc, record) => {
    if (!record.lastModifiedAt) return acc;
    if (!acc || record.lastModifiedAt > acc) {
      return record.lastModifiedAt;
    }
    return acc;
  }, null);

  const projectMeta: ProjectMeta = {
    workspaceName: getWorkspaceName(workspacePath),
    workspacePath,
    lastSessionAt,
    sessionCount: sessions.length,
  };

  return projectMeta;
};
