import type { Conversation } from "../../../lib/conversation-schema";

export type ErrorJsonl = {
  type: "x-error";
  line: string;
  lineNumber: number;
};

export type ExtendedConversation = Conversation | ErrorJsonl;

export type ClaudeCodeProject = {
  id: string;
  projectPath: string;
  claudeProjectPath: string;
  lastModifiedAt: Date;
  meta: ClaudeCodeProjectMeta;
};

export type ClaudeCodeProjectMeta = {
  sessionCount: number;
  lastSessionDate: Date | null;
};

export type ClaudeCodeSession = {
  id: string;
  jsonlFilePath: string;
  lastModifiedAt: Date;
  meta: ClaudeCodeSessionMeta;
};

export type ClaudeCodeSessionMeta = {
  messageCount: number;
  firstUserMessage: string | null;
  modelName: string | null;
  cost: {
    totalUsd: number;
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
    };
  };
};

export type ClaudeCodeSessionDetail = ClaudeCodeSession & {
  conversations: ExtendedConversation[];
};
