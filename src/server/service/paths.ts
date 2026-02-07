import { homedir } from "node:os";
import { resolve } from "node:path";

// Codex paths
export const codexSessionsRootPath = resolve(homedir(), ".codex", "sessions");
export const codexHistoryFilePath = resolve(
  homedir(),
  ".codex",
  "history.jsonl",
);

// Claude Code paths
export const claudeCodeProjectsRootPath = resolve(
  homedir(),
  ".claude",
  "projects",
);
