import { readFile, stat } from "node:fs/promises";

import { parseCodexSession } from "../codex/parseCodexSession";
import type { ParsedCommand } from "../parseCommandXml";
import type { SessionMeta } from "../types";

export const getSessionMeta = async (
  jsonlFilePath: string,
): Promise<SessionMeta> => {
  let stats: Awaited<ReturnType<typeof stat>> | undefined;
  try {
    stats = await stat(jsonlFilePath);
  } catch (error) {
    console.warn(`Failed to stat session file ${jsonlFilePath}`, error);
  }

  let content = "";
  try {
    content = await readFile(jsonlFilePath, "utf-8");
  } catch (error) {
    console.warn(`Failed to read session file ${jsonlFilePath}`, error);
  }

  const parsed = parseCodexSession(content);

  let firstCommand: ParsedCommand | null = null;
  const firstTurnWithUserMessage = parsed.turns.find((turn) => {
    const text = turn.userMessage?.text;
    return typeof text === "string" && text.trim().length > 0;
  });
  if (firstTurnWithUserMessage?.userMessage?.text) {
    firstCommand = {
      kind: "text",
      content: firstTurnWithUserMessage.userMessage.text,
    };
  }

  const sessionMeta: SessionMeta = {
    messageCount: parsed.entries.length,
    firstCommand,
    lastModifiedAt: stats?.mtime ? stats.mtime.toISOString() : null,
    startedAt: stats?.birthtime ? stats.birthtime.toISOString() : null,
  };

  return sessionMeta;
};
