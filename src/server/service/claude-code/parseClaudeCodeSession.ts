import { ConversationSchema } from "../../../lib/conversation-schema";
import type { ErrorJsonl, ExtendedConversation } from "./types";

export const parseClaudeCodeSession = (
  content: string,
): ExtendedConversation[] => {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  return lines.map((line, index) => {
    try {
      const parsed = ConversationSchema.safeParse(JSON.parse(line));
      if (!parsed.success) {
        const errorData: ErrorJsonl = {
          type: "x-error",
          line,
          lineNumber: index + 1,
        };
        return errorData;
      }

      return parsed.data;
    } catch {
      const errorData: ErrorJsonl = {
        type: "x-error",
        line,
        lineNumber: index + 1,
      };
      return errorData;
    }
  });
};

// Extract first user message text from conversation
export const extractFirstUserText = (
  conversations: ExtendedConversation[],
): string | null => {
  const firstUserEntry = conversations.find((c) => c.type === "user");
  if (!firstUserEntry || firstUserEntry.type !== "user") return null;

  const content = firstUserEntry.message.content;
  if (typeof content === "string") return content.slice(0, 200);

  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") return item.slice(0, 200);
      if (typeof item === "object" && item !== null && "type" in item) {
        if (item.type === "text" && "text" in item) {
          return (item.text as string).slice(0, 200);
        }
      }
    }
  }

  return null;
};

// Calculate token usage and cost from conversations
export const calculateSessionCost = (
  conversations: ExtendedConversation[],
): {
  totalUsd: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  modelName: string | null;
} => {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let modelName: string | null = null;

  for (const conv of conversations) {
    if (conv.type === "assistant") {
      const usage = conv.message.usage;
      inputTokens += usage.input_tokens;
      outputTokens += usage.output_tokens;
      cacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
      cacheReadTokens += usage.cache_read_input_tokens ?? 0;
      if (!modelName) {
        modelName = conv.message.model;
      }
    }
  }

  // Approximate cost calculation (Claude 3.5 Sonnet pricing)
  // Input: $3/1M tokens, Output: $15/1M tokens, Cache: $3.75/1M tokens
  const inputCost = inputTokens * 0.000003;
  const outputCost = outputTokens * 0.000015;
  const cacheCost = (cacheCreationTokens + cacheReadTokens) * 0.00000375;

  return {
    totalUsd: inputCost + outputCost + cacheCost,
    tokenUsage: {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
    },
    modelName,
  };
};
