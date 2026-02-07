"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CopyIcon,
  DollarSign,
  ExternalLinkIcon,
  Loader2,
  MenuIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../../../../components/ui/badge";
import { Button } from "../../../../../../components/ui/button";
import { honoClient } from "../../../../../../lib/api/client";
import { ClaudeCodeConversationList } from "../../../../components/ClaudeCodeConversationList";
import { CodexConversationList } from "../../../../components/CodexConversationList";
import { SessionSidebar } from "./components/SessionSidebar";

type SessionItem = {
  id: string;
  title: string;
  messageCount?: number;
  lastModifiedAt: string | null;
};

type CodexSession = {
  id: string;
  sessionUuid?: string;
  meta: {
    messageCount?: number;
    lastModifiedAt: string | null;
    firstCommand: {
      kind: string;
      commandName?: string;
      commandArgs?: string;
      content?: string;
      stdout?: string;
    } | null;
  };
};

type ClaudeCodeSessionListItem = {
  id: string;
  lastModifiedAt: string;
  meta: {
    messageCount: number;
    firstUserMessage: string | null;
    modelName: string | null;
    cost: { totalUsd: number };
  };
};

const getCodexSessionTitle = (session: CodexSession): string => {
  if (session.meta.firstCommand) {
    const cmd = session.meta.firstCommand;
    switch (cmd.kind) {
      case "command":
        return cmd.commandArgs
          ? `${cmd.commandName} ${cmd.commandArgs}`
          : (cmd.commandName ?? session.id);
      case "local-command":
        return cmd.stdout ?? session.id;
      case "text":
        return cmd.content ?? session.id;
      default:
        return session.id;
    }
  }
  return session.id;
};

const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

function useProjectSessions(source: string, projectId: string) {
  return useQuery({
    queryKey: [source === "codex" ? "codex-project" : "claude-code-project", projectId],
    queryFn: async () => {
      if (source === "codex") {
        const res = await honoClient.api.codex.projects[":projectId"].$get({
          param: { projectId },
        });
        return res.json();
      }
      const res = await honoClient.api["claude-code"].projects[":projectId"].$get({
        param: { projectId },
      });
      return res.json();
    },
  });
}

function normalizeSessionsForSidebar(
  source: string,
  data: ReturnType<typeof useProjectSessions>["data"],
): { sessions: SessionItem[]; projectPath: string } {
  if (!data) return { sessions: [], projectPath: "" };

  if (source === "codex") {
    const sessions = ((data as { sessions?: CodexSession[] }).sessions ?? []).map(
      (s: CodexSession): SessionItem => ({
        id: s.id,
        title: getCodexSessionTitle(s),
        messageCount: s.meta.messageCount ?? undefined,
        lastModifiedAt: s.meta.lastModifiedAt,
      }),
    );
    const project = (data as { project?: { workspacePath?: string; meta?: { workspacePath?: string } } }).project;
    return {
      sessions,
      projectPath: project?.meta?.workspacePath ?? project?.workspacePath ?? "",
    };
  }

  const sessions = ((data as { sessions?: ClaudeCodeSessionListItem[] }).sessions ?? []).map(
    (s: ClaudeCodeSessionListItem): SessionItem => ({
      id: s.id,
      title: s.meta.firstUserMessage ?? s.id,
      messageCount: s.meta.messageCount,
      lastModifiedAt: s.lastModifiedAt,
    }),
  );
  const project = (data as { project?: { projectPath?: string } }).project;
  return {
    sessions,
    projectPath: project?.projectPath ?? "",
  };
}

function CodexSessionContent({
  projectId,
  sessionId,
  onTitleResolved,
}: {
  projectId: string;
  sessionId: string;
  onTitleResolved: (title: string) => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["codex-session", projectId, sessionId],
    queryFn: async () => {
      const res = await honoClient.api.codex.projects[":projectId"].sessions[
        ":sessionId"
      ].$get({
        param: { projectId, sessionId },
      });
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.session) {
      const session = data.session;
      if (session.meta.firstCommand) {
        const cmd = session.meta.firstCommand;
        let title = session.id ?? sessionId;
        if (cmd.kind === "command") {
          title = cmd.commandArgs
            ? `${cmd.commandName} ${cmd.commandArgs}`
            : (cmd.commandName ?? title);
        } else if (cmd.kind === "local-command") {
          title = cmd.stdout ?? title;
        } else if (cmd.kind === "text") {
          title = cmd.content ?? title;
        }
        onTitleResolved(title);
      }
    }
  }, [data, sessionId, onTitleResolved]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.session) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading session
      </div>
    );
  }

  return <CodexConversationList turns={data.session.turns} />;
}

function ClaudeCodeSessionContent({
  projectId,
  sessionId,
  onTitleResolved,
  onMetaResolved,
}: {
  projectId: string;
  sessionId: string;
  onTitleResolved: (title: string) => void;
  onMetaResolved: (meta: {
    messageCount: number;
    cost: number;
    modelName: string | null;
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
    };
  }) => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["claude-code-session", projectId, sessionId],
    queryFn: async () => {
      const res = await honoClient.api["claude-code"].projects[
        ":projectId"
      ].sessions[":sessionId"].$get({
        param: { projectId, sessionId },
      });
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.session) {
      const session = data.session;
      if (session.meta.firstUserMessage) {
        onTitleResolved(session.meta.firstUserMessage);
      }
      onMetaResolved({
        messageCount: session.meta.messageCount,
        cost: session.meta.cost.totalUsd,
        modelName: session.meta.modelName,
        tokenUsage: session.meta.cost.tokenUsage,
      });
    }
  }, [data, onTitleResolved, onMetaResolved]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.session) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading session
      </div>
    );
  }

  return (
    <ClaudeCodeConversationList conversations={data.session.conversations} />
  );
}

export default function SessionDetailPage() {
  const params = useParams();
  const source = params["source"] as string;
  const projectId = params["projectId"] as string;
  const sessionId = params["sessionId"] as string;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState<string>(sessionId);
  const [claudeCodeMeta, setClaudeCodeMeta] = useState<{
    messageCount: number;
    cost: number;
    modelName: string | null;
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
    };
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);

  const { data: projectData } = useProjectSessions(source, projectId);
  const { sessions, projectPath } = normalizeSessionsForSidebar(
    source,
    projectData,
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleCopySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success("Session ID copied");
    } catch {
      toast.error("Failed to copy session ID");
    }
  };

  const handleTitleResolved = useCallback((title: string) => {
    setSessionTitle(title);
  }, []);

  const handleMetaResolved = useCallback(
    (meta: {
      messageCount: number;
      cost: number;
      modelName: string | null;
      tokenUsage: {
        inputTokens: number;
        outputTokens: number;
        cacheCreationTokens: number;
        cacheReadTokens: number;
      };
    }) => {
      setClaudeCodeMeta(meta);
    },
    [],
  );

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!hasInitialScrollRef.current) {
      const timer = setTimeout(() => {
        scrollToBottom("auto");
        hasInitialScrollRef.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [scrollToBottom]);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      <SessionSidebar
        currentSessionId={sessionId}
        source={source}
        projectId={projectId}
        sessions={sessions}
        isMobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Sticky Header */}
        <header className="px-2 sm:px-3 py-2 sm:py-3 sticky top-0 z-10 bg-background w-full flex-shrink-0 min-w-0 border-b">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden flex-shrink-0"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <MenuIcon className="w-4 h-4" />
              </Button>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-all overflow-ellipsis line-clamp-1 px-1 sm:px-5 min-w-0">
                {sessionTitle}
              </h1>
            </div>

            <div className="px-1 sm:px-5 flex flex-wrap items-center gap-1 sm:gap-2">
              {projectPath && (
                <Link
                  href={`/projects/${source}/${projectId}`}
                  className="transition-all duration-200"
                >
                  <Badge
                    variant="secondary"
                    className="h-6 sm:h-8 text-xs sm:text-sm flex items-center hover:bg-blue-50/60 hover:border-blue-300/60 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <ExternalLinkIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {projectPath}
                  </Badge>
                </Link>
              )}
              <div className="flex items-center gap-1 sm:gap-2">
                <Badge
                  variant="secondary"
                  className="h-6 sm:h-8 text-xs sm:text-sm flex items-center gap-1"
                >
                  <span className="font-semibold">sessionId:</span>
                  <span className="font-mono">
                    {sessionId.length > 16
                      ? `${sessionId.slice(0, 8)}...`
                      : sessionId}
                  </span>
                </Badge>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 sm:h-8 sm:w-8"
                  onClick={() => {
                    void handleCopySessionId();
                  }}
                  aria-label="Copy session ID"
                >
                  <CopyIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>

              {/* Claude Code meta badges */}
              {source === "claude-code" && claudeCodeMeta && (
                <>
                  <Badge
                    variant="secondary"
                    className="h-6 sm:h-8 text-xs sm:text-sm flex items-center gap-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    {formatCost(claudeCodeMeta.cost)}
                  </Badge>
                  {claudeCodeMeta.modelName && (
                    <Badge variant="outline" className="h-6 sm:h-8 text-xs sm:text-sm">
                      {claudeCodeMeta.modelName.split("-").slice(0, 2).join("-")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {claudeCodeMeta.messageCount} msgs | in{" "}
                    {claudeCodeMeta.tokenUsage.inputTokens.toLocaleString()}, out{" "}
                    {claudeCodeMeta.tokenUsage.outputTokens.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Conversation Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 min-w-0 relative"
        >
          <main className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-5 min-w-0 py-6">
            {source === "codex" ? (
              <CodexSessionContent
                projectId={projectId}
                sessionId={sessionId}
                onTitleResolved={handleTitleResolved}
              />
            ) : (
              <ClaudeCodeSessionContent
                projectId={projectId}
                sessionId={sessionId}
                onTitleResolved={handleTitleResolved}
                onMetaResolved={handleMetaResolved}
              />
            )}
          </main>
        </div>
      </div>

      {/* Floating Scroll Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <Button
          variant="secondary"
          size="icon"
          className="shadow"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="shadow"
          onClick={() => scrollToBottom()}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
