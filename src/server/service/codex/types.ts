import type { ChildProcess } from "node:child_process";

export type CodexTaskStatus = "running" | "waiting" | "completed" | "failed";

export type QueuedMessage = {
  requestId: string;
  message: string;
  resolve: (value: SerializableAliveTask) => void;
  reject: (reason?: unknown) => void;
};

export type CodexTask = {
  id: string;
  projectId: string;
  cwd: string;
  status: CodexTaskStatus;
  sessionUuid: string | null;
  sessionPathId: string | null;
  userMessageId: string;
  process: ChildProcess | null;
  queue: QueuedMessage[];
};

export type SerializableAliveTask = {
  id: string;
  status: CodexTaskStatus;
  sessionId: string | null;
  sessionUuid: string | null;
  userMessageId: string;
};
