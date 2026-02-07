"use client";
import { Bot, ChevronDown, ChevronRight, User, Wrench } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import type { ExtendedConversation } from "../../../server/service/claude-code/types";

type AssistantContent = {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | { type: string; text?: string }[];
  is_error?: boolean;
};

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleString("ja-JP");
  } catch {
    return timestamp;
  }
};

const extractUserText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null) {
          if ("text" in item && typeof item.text === "string") return item.text;
          if ("type" in item && item.type === "tool_result") {
            const toolContent = (item as { content?: unknown }).content;
            if (typeof toolContent === "string")
              return `[Tool Result] ${toolContent}`;
            return "[Tool Result]";
          }
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const UserMessage = ({
  conversation,
}: {
  conversation: Extract<ExtendedConversation, { type: "user" }>;
}) => {
  const text = extractUserText(conversation.message.content);

  return (
    <Card className="max-w-4xl bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
          <User className="h-4 w-4" />
          User
        </div>
        <pre className="whitespace-pre-wrap break-words text-sm font-mono">
          {text}
        </pre>
        <div className="text-xs text-muted-foreground mt-2">
          {formatTimestamp(conversation.timestamp)}
        </div>
      </CardContent>
    </Card>
  );
};

const ToolUseCard = ({ content }: { content: AssistantContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (content.type !== "tool_use") return null;

  return (
    <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/50">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Wrench className="h-4 w-4" />
          <span>{content.name}</span>
        </button>
        {isExpanded && content.input && (
          <pre className="mt-3 text-xs font-mono overflow-x-auto bg-white/50 dark:bg-black/20 p-2 rounded">
            {JSON.stringify(content.input, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

const ThinkingCard = ({ content }: { content: AssistantContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (content.type !== "thinking") return null;

  return (
    <Card className="bg-purple-50/50 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-800/50">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Thinking</span>
          <Badge variant="outline" className="text-xs">
            {(content.thinking?.length ?? 0).toLocaleString()} chars
          </Badge>
        </button>
        {isExpanded && content.thinking && (
          <pre className="mt-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-white/50 dark:bg-black/20 p-2 rounded max-h-96 overflow-y-auto">
            {content.thinking}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

const AssistantMessage = ({
  conversation,
}: {
  conversation: Extract<ExtendedConversation, { type: "assistant" }>;
}) => {
  const contents = conversation.message.content as AssistantContent[];
  const textContents = contents.filter((c) => c.type === "text");
  const toolUses = contents.filter((c) => c.type === "tool_use");
  const thinkingContents = contents.filter((c) => c.type === "thinking");

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        <Bot className="h-4 w-4" />
        Assistant
        <Badge variant="outline" className="text-xs">
          {conversation.message.model.split("-").slice(0, 2).join("-")}
        </Badge>
      </div>

      {thinkingContents.map((content) => (
        <ThinkingCard
          key={content.thinking?.slice(0, 50) ?? Math.random().toString()}
          content={content}
        />
      ))}

      {textContents.map((content) =>
        content.text ? (
          <pre
            key={content.text.slice(0, 50)}
            className="whitespace-pre-wrap break-words text-sm font-mono"
          >
            {content.text}
          </pre>
        ) : null,
      )}

      {toolUses.length > 0 && (
        <div className="space-y-2">
          {toolUses.map((content) => (
            <ToolUseCard key={content.id ?? content.name} content={content} />
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {formatTimestamp(conversation.timestamp)}
        {conversation.message.usage && (
          <span className="ml-2">
            (in: {conversation.message.usage.input_tokens.toLocaleString()},
            out: {conversation.message.usage.output_tokens.toLocaleString()})
          </span>
        )}
      </div>
    </div>
  );
};

const SummaryMessage = ({
  conversation,
}: {
  conversation: Extract<ExtendedConversation, { type: "summary" }>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="max-w-4xl bg-gray-50/50 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-800/50">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Conversation Summary</span>
        </button>
        {isExpanded && (
          <pre className="mt-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
            {conversation.summary}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

const SystemMessage = ({
  conversation,
}: {
  conversation: Extract<ExtendedConversation, { type: "system" }>;
}) => {
  return (
    <div className="max-w-4xl text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded">
      [System]{" "}
      {"content" in conversation
        ? (conversation as { content?: string }).content
        : "system message"}
    </div>
  );
};

export const ClaudeCodeConversationList = ({
  conversations,
}: {
  conversations: ExtendedConversation[];
}) => {
  if (conversations.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No conversation entries found.
      </div>
    );
  }

  // Filter out progress, file-history-snapshot, queue-operation entries
  const displayableConversations = conversations.filter(
    (c) =>
      c.type === "user" ||
      c.type === "assistant" ||
      c.type === "summary" ||
      c.type === "system",
  );

  return (
    <div className="flex flex-col gap-6">
      {displayableConversations.map((conversation, index) => {
        const key =
          "uuid" in conversation ? conversation.uuid : `entry-${index}`;

        switch (conversation.type) {
          case "user":
            return <UserMessage key={key} conversation={conversation} />;
          case "assistant":
            return <AssistantMessage key={key} conversation={conversation} />;
          case "summary":
            return <SummaryMessage key={key} conversation={conversation} />;
          case "system":
            return <SystemMessage key={key} conversation={conversation} />;
          default:
            return null;
        }
      })}
    </div>
  );
};
