import { existsSync } from "node:fs";

import { listSessionsForWorkspace } from "../codex/sessionFiles";
import type { Project } from "../types";
import { getProjectMeta } from "./getProjectMeta";
import { decodeProjectId } from "./id";

export const getProject = async (
  projectId: string,
): Promise<{ project: Project }> => {
  const workspacePath = decodeProjectId(projectId);

  if (!existsSync(workspacePath)) {
    const sessions = await listSessionsForWorkspace(workspacePath);
    if (sessions.length === 0) {
      throw new Error("Project not found");
    }
  }

  const meta = await getProjectMeta(workspacePath);

  return {
    project: {
      id: projectId,
      workspacePath,
      meta,
    },
  };
};
