import { readFile } from "node:fs/promises";

import { parseCodexSession } from "../codex/parseCodexSession";
import { readSessionHeader } from "../codex/sessionFiles";
import { decodeProjectId } from "../project/id";
import type { SessionDetail } from "../types";
import { getSessionMeta } from "./getSessionMeta";
import { decodeSessionId } from "./id";

export const getSession = async (
  projectId: string,
  sessionId: string,
): Promise<{
  session: SessionDetail;
}> => {
  const workspacePath = decodeProjectId(projectId);
  const sessionPath = decodeSessionId(sessionId);

  const header = await readSessionHeader(sessionPath);
  if (header?.workspacePath && header.workspacePath !== workspacePath) {
    throw new Error("Session does not belong to the requested project");
  }

  let fileContent = "";
  try {
    fileContent = await readFile(sessionPath, "utf-8");
  } catch (error) {
    console.warn(`Failed to read session file ${sessionPath}`, error);
  }

  const parsed = parseCodexSession(fileContent);

  const sessionDetail: SessionDetail = {
    id: sessionId,
    sessionUuid: header?.sessionUuid ?? null,
    jsonlFilePath: sessionPath,
    meta: await getSessionMeta(sessionPath),
    entries: parsed.entries,
    turns: parsed.turns,
    metaEvents: parsed.metaEvents,
    sessionMeta: parsed.sessionMeta,
  };

  return {
    session: sessionDetail,
  };
};
