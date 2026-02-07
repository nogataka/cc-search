import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  calculateSessionCost,
  extractFirstUserText,
  parseClaudeCodeSession,
} from "./parseClaudeCodeSession";
import { decodeProjectId } from "./projectId";
import type { ClaudeCodeSessionDetail } from "./types";

export const getClaudeCodeSession = async (
  projectId: string,
  sessionId: string,
): Promise<{
  session: ClaudeCodeSessionDetail | null;
}> => {
  try {
    const projectPath = decodeProjectId(projectId);
    const sessionPath = resolve(projectPath, `${sessionId}.jsonl`);

    const content = await readFile(sessionPath, "utf-8");
    const conversations = parseClaudeCodeSession(content);

    const firstUserMessage = extractFirstUserText(conversations);
    const { totalUsd, tokenUsage, modelName } =
      calculateSessionCost(conversations);

    const session: ClaudeCodeSessionDetail = {
      id: sessionId,
      jsonlFilePath: sessionPath,
      lastModifiedAt: new Date(), // Will be updated from file stat
      conversations,
      meta: {
        messageCount: conversations.filter(
          (c) => c.type === "user" || c.type === "assistant",
        ).length,
        firstUserMessage,
        modelName,
        cost: {
          totalUsd,
          tokenUsage,
        },
      },
    };

    return { session };
  } catch {
    return { session: null };
  }
};
