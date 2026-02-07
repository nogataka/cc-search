import { readFile } from "node:fs/promises";
import {
  calculateSessionCost,
  extractFirstUserText,
  parseClaudeCodeSession,
} from "./parseClaudeCodeSession";
import { decodeProjectId } from "./projectId";
import { getSessionFiles } from "./sessionFiles";
import type { ClaudeCodeSession } from "./types";

export const getClaudeCodeSessions = async (
  projectId: string,
): Promise<{
  sessions: ClaudeCodeSession[];
}> => {
  try {
    const projectPath = decodeProjectId(projectId);
    const sessionFiles = await getSessionFiles(projectPath);

    const sessions = await Promise.all(
      sessionFiles.map(async (file) => {
        try {
          // Read and parse the session file for meta
          const content = await readFile(file.filePath, "utf-8");
          const conversations = parseClaudeCodeSession(content);

          const firstUserMessage = extractFirstUserText(conversations);
          const { totalUsd, tokenUsage, modelName } =
            calculateSessionCost(conversations);

          const session: ClaudeCodeSession = {
            id: file.sessionId,
            jsonlFilePath: file.filePath,
            lastModifiedAt: file.lastModifiedAt,
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

          return session;
        } catch {
          // Return basic session info if parsing fails
          const session: ClaudeCodeSession = {
            id: file.sessionId,
            jsonlFilePath: file.filePath,
            lastModifiedAt: file.lastModifiedAt,
            meta: {
              messageCount: 0,
              firstUserMessage: null,
              modelName: null,
              cost: {
                totalUsd: 0,
                tokenUsage: {
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheCreationTokens: 0,
                  cacheReadTokens: 0,
                },
              },
            },
          };
          return session;
        }
      }),
    );

    return { sessions };
  } catch {
    return { sessions: [] };
  }
};
