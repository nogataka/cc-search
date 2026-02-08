import { open, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

// Encode project path to a safe ID (base64url)
export const encodeProjectId = (projectPath: string): string => {
  return Buffer.from(projectPath).toString("base64url");
};

// Decode project ID back to path
export const decodeProjectId = (projectId: string): string => {
  return Buffer.from(projectId, "base64url").toString();
};

// Convert Claude Code directory name to original project path (fallback)
// e.g., "-Users-nogataka-dev-autocoder" -> "/Users/nogataka/dev/autocoder"
export const dirNameToProjectPath = (dirName: string): string => {
  return dirName.replace(/-/g, "/");
};

// Convert project path to Claude Code directory name
// e.g., "/Users/nogataka/dev/autocoder" -> "-Users-nogataka-dev-autocoder"
export const projectPathToDirName = (projectPath: string): string => {
  return projectPath.replace(/\/$/, "").replace(/\//g, "-");
};

type SessionsIndex = {
  originalPath?: string;
  entries?: { projectPath?: string }[];
};

// Read cwd from the first "user" type line of a JSONL session file
const readCwdFromJsonl = async (filePath: string): Promise<string | null> => {
  const fileHandle = await open(filePath, "r");
  try {
    const rl = createInterface({ input: fileHandle.createReadStream() });
    for await (const line of rl) {
      try {
        const data = JSON.parse(line);
        if (data.cwd) {
          rl.close();
          return data.cwd;
        }
      } catch {
        // skip unparseable lines
      }
    }
  } finally {
    await fileHandle.close();
  }
  return null;
};

// Read the actual project path from sessions-index.json
// Falls back to reading cwd from JSONL, then to dirNameToProjectPath
export const readProjectPathFromIndex = async (
  claudeProjectDir: string,
): Promise<string> => {
  // 1. Try sessions-index.json
  try {
    const indexPath = resolve(claudeProjectDir, "sessions-index.json");
    const content = await readFile(indexPath, "utf-8");
    const index: SessionsIndex = JSON.parse(content);

    if (index.originalPath) {
      return index.originalPath;
    }
    if (index.entries?.[0]?.projectPath) {
      return index.entries[0].projectPath;
    }
  } catch {
    // sessions-index.json doesn't exist or can't be parsed
  }

  // 2. Try reading cwd from the first JSONL session file
  try {
    const files = await readdir(claudeProjectDir);
    const jsonlFile = files.find((f) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i.test(
        f,
      ),
    );
    if (jsonlFile) {
      const cwd = await readCwdFromJsonl(resolve(claudeProjectDir, jsonlFile));
      if (cwd) {
        return cwd;
      }
    }
  } catch {
    // Failed to read JSONL files
  }

  // 3. Last resort: directory name conversion
  const dirName = claudeProjectDir.split("/").pop() ?? claudeProjectDir;
  return dirNameToProjectPath(dirName);
};
