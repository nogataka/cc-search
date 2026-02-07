import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  extractFirstUserText,
  parseClaudeCodeSession,
} from "../claude-code/parseClaudeCodeSession";
import { readProjectPathFromIndex } from "../claude-code/projectId";
import type { ExtendedConversation } from "../claude-code/types";
import { parseCodexSession } from "../codex/parseCodexSession";
import { claudeCodeProjectsRootPath, codexSessionsRootPath } from "../paths";

export type SearchResult = {
  source: "codex" | "claude-code";
  projectId: string;
  projectPath: string;
  sessionId: string;
  matchedText: string;
  contextBefore: string;
  contextAfter: string;
  timestamp: string | null;
  role: "user" | "assistant";
};

type SearchOptions = {
  query: string;
  sources: ("codex" | "claude-code")[];
  limit: number;
  offset: number;
};

const extractTextFromClaudeCodeConversation = (
  conversation: ExtendedConversation,
): { role: "user" | "assistant"; text: string; timestamp: string } | null => {
  if (conversation.type === "user") {
    const text = extractFirstUserText([conversation]);
    if (text) {
      return {
        role: "user",
        text,
        timestamp: conversation.timestamp,
      };
    }
  } else if (conversation.type === "assistant") {
    // Extract only text content, exclude tool_use and tool_result
    const textContents = (
      conversation.message.content as Array<{ type: string; text?: string }>
    )
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n");
    if (textContents) {
      return {
        role: "assistant",
        text: textContents,
        timestamp: conversation.timestamp,
      };
    }
  }
  return null;
};

const searchClaudeCode = async (
  query: string,
  limit: number,
): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  try {
    const projectDirs = await readdir(claudeCodeProjectsRootPath);

    for (const projectDir of projectDirs) {
      if (results.length >= limit) break;

      const projectDirPath = resolve(claudeCodeProjectsRootPath, projectDir);
      const projectStat = await stat(projectDirPath).catch(() => null);
      if (!projectStat?.isDirectory()) continue;

      const displayPath = await readProjectPathFromIndex(projectDirPath);

      const files = await readdir(projectDirPath).catch(() => []);
      const sessionFiles = files.filter((f) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i.test(
          f,
        ),
      );

      for (const sessionFile of sessionFiles) {
        if (results.length >= limit) break;

        const sessionPath = resolve(projectDirPath, sessionFile);
        const sessionId = sessionFile.replace(".jsonl", "");

        try {
          const content = await readFile(sessionPath, "utf-8");
          const conversations = parseClaudeCodeSession(content);

          for (const conv of conversations) {
            if (results.length >= limit) break;

            const extracted = extractTextFromClaudeCodeConversation(conv);
            if (!extracted) continue;

            const textLower = extracted.text.toLowerCase();
            const matchIndex = textLower.indexOf(queryLower);
            if (matchIndex === -1) continue;

            // Extract context around the match
            const contextStart = Math.max(0, matchIndex - 100);
            const contextEnd = Math.min(
              extracted.text.length,
              matchIndex + query.length + 100,
            );
            const contextBefore = extracted.text.slice(
              contextStart,
              matchIndex,
            );
            const matchedText = extracted.text.slice(
              matchIndex,
              matchIndex + query.length,
            );
            const contextAfter = extracted.text.slice(
              matchIndex + query.length,
              contextEnd,
            );

            results.push({
              source: "claude-code",
              projectId: Buffer.from(projectDirPath).toString("base64url"),
              projectPath: displayPath,
              sessionId,
              matchedText,
              contextBefore,
              contextAfter,
              timestamp: extracted.timestamp,
              role: extracted.role,
            });
          }
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  } catch {
    // Skip if Claude Code directory doesn't exist
  }

  return results;
};

const searchCodex = async (
  query: string,
  limit: number,
): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  try {
    const projectDirs = await readdir(codexSessionsRootPath);

    for (const projectDir of projectDirs) {
      if (results.length >= limit) break;

      const projectPath = resolve(codexSessionsRootPath, projectDir);
      const projectStat = await stat(projectPath).catch(() => null);
      if (!projectStat?.isDirectory()) continue;

      const files = await readdir(projectPath).catch(() => []);
      const sessionFiles = files.filter((f) => f.endsWith(".jsonl"));

      for (const sessionFile of sessionFiles) {
        if (results.length >= limit) break;

        const sessionPath = resolve(projectPath, sessionFile);
        const sessionId = sessionFile.replace(".jsonl", "");

        try {
          const content = await readFile(sessionPath, "utf-8");
          const session = parseCodexSession(content);

          for (const turn of session.turns) {
            if (results.length >= limit) break;

            // Search in user messages
            if (turn.userMessage?.text) {
              const textLower = turn.userMessage.text.toLowerCase();
              const matchIndex = textLower.indexOf(queryLower);
              if (matchIndex !== -1) {
                const contextStart = Math.max(0, matchIndex - 100);
                const contextEnd = Math.min(
                  turn.userMessage.text.length,
                  matchIndex + query.length + 100,
                );
                results.push({
                  source: "codex",
                  projectId: Buffer.from(projectPath).toString("base64url"),
                  projectPath: projectDir,
                  sessionId,
                  matchedText: turn.userMessage.text.slice(
                    matchIndex,
                    matchIndex + query.length,
                  ),
                  contextBefore: turn.userMessage.text.slice(
                    contextStart,
                    matchIndex,
                  ),
                  contextAfter: turn.userMessage.text.slice(
                    matchIndex + query.length,
                    contextEnd,
                  ),
                  timestamp: turn.userMessage.timestamp,
                  role: "user",
                });
              }
            }

            // Search in assistant messages
            for (const msg of turn.assistantMessages) {
              if (results.length >= limit) break;

              const textLower = msg.text.toLowerCase();
              const matchIndex = textLower.indexOf(queryLower);
              if (matchIndex !== -1) {
                const contextStart = Math.max(0, matchIndex - 100);
                const contextEnd = Math.min(
                  msg.text.length,
                  matchIndex + query.length + 100,
                );
                results.push({
                  source: "codex",
                  projectId: Buffer.from(projectPath).toString("base64url"),
                  projectPath: projectDir,
                  sessionId,
                  matchedText: msg.text.slice(
                    matchIndex,
                    matchIndex + query.length,
                  ),
                  contextBefore: msg.text.slice(contextStart, matchIndex),
                  contextAfter: msg.text.slice(
                    matchIndex + query.length,
                    contextEnd,
                  ),
                  timestamp: msg.timestamp,
                  role: "assistant",
                });
              }
            }
          }
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  } catch {
    // Skip if Codex directory doesn't exist
  }

  return results;
};

export const search = async (
  options: SearchOptions,
): Promise<{ results: SearchResult[]; total: number }> => {
  const { query, sources, limit, offset } = options;
  let allResults: SearchResult[] = [];

  // Search in parallel
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (sources.includes("claude-code")) {
    searchPromises.push(searchClaudeCode(query, limit + offset));
  }

  if (sources.includes("codex")) {
    searchPromises.push(searchCodex(query, limit + offset));
  }

  const resultsArrays = await Promise.all(searchPromises);
  allResults = resultsArrays.flat();

  // Sort by timestamp (newest first)
  allResults.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);

  return { results: paginatedResults, total };
};
