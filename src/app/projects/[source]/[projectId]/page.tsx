"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  DollarSign,
  FolderIcon,
  Loader2,
  MessageSquareIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SettingsControls } from "../../../../components/SettingsControls";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../../components/ui/collapsible";
import { useConfig } from "../../../hooks/useConfig";
import { honoClient } from "../../../../lib/api/client";

type CodexSession = {
  id: string;
  sessionUuid?: string;
  jsonlFilePath?: string;
  meta: {
    messageCount?: number;
    lastModifiedAt: string | null;
    startedAt?: string | null;
    firstCommand: {
      kind: string;
      commandName?: string;
      commandArgs?: string;
      content?: string;
      stdout?: string;
    } | null;
  };
};

type ClaudeCodeSession = {
  id: string;
  lastModifiedAt: string;
  meta: {
    messageCount: number;
    firstUserMessage: string | null;
    modelName: string | null;
    cost: {
      totalUsd: number;
    };
  };
};

const getSessionTitle = (
  session: CodexSession | ClaudeCodeSession,
  source: string,
) => {
  if (source === "codex") {
    const codexSession = session as CodexSession;
    if (codexSession.meta.firstCommand) {
      const cmd = codexSession.meta.firstCommand;
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
  }
  const ccSession = session as ClaudeCodeSession;
  return ccSession.meta.firstUserMessage ?? session.id;
};

const formatCost = (cost: number) => {
  return `$${cost.toFixed(2)}`;
};

function CodexSessionList({ projectId }: { projectId: string }) {
  const queryKey = ["codex-project", projectId];
  const { config } = useConfig();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await honoClient.api.codex.projects[":projectId"].$get({
        param: { projectId },
      });
      return res.json();
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: invalidate when config changed
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [config?.hideNoUserMessageSession, config?.unifySameTitleSession]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading sessions
      </div>
    );
  }

  const sessions = (data?.sessions ?? []) as CodexSession[];
  const project = data?.project as {
    workspacePath: string;
    meta?: { workspacePath?: string };
  } | null;

  return (
    <SessionPageLayout
      title={project?.meta?.workspacePath ?? project?.workspacePath ?? "Project"}
      subtitle={project?.workspacePath ?? undefined}
      sessionCount={sessions.length}
      invalidateQueryKey={queryKey}
    >
      {sessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="break-words overflow-ellipsis line-clamp-2 text-lg">
                {getSessionTitle(session, "codex")}
              </span>
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {session.sessionUuid ?? session.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {session.meta.messageCount != null && (
              <p className="text-sm text-muted-foreground">
                {session.meta.messageCount} messages
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Last modified:{" "}
              {session.meta.lastModifiedAt
                ? new Date(session.meta.lastModifiedAt).toLocaleDateString()
                : ""}
            </p>
            {session.meta.startedAt && (
              <p className="text-xs text-muted-foreground">
                Started:{" "}
                {new Date(session.meta.startedAt).toLocaleString()}
              </p>
            )}
            {session.jsonlFilePath && (
              <p className="text-xs text-muted-foreground font-mono">
                {session.jsonlFilePath}
              </p>
            )}
          </CardContent>
          <CardContent className="pt-0">
            <Button asChild className="w-full">
              <Link
                href={`/projects/codex/${projectId}/sessions/${session.id}`}
              >
                View Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </SessionPageLayout>
  );
}

function ClaudeCodeSessionList({ projectId }: { projectId: string }) {
  const queryKey = ["claude-code-project", projectId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await honoClient.api["claude-code"].projects[
        ":projectId"
      ].$get({
        param: { projectId },
      });
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading sessions
      </div>
    );
  }

  const sessions = (data?.sessions ?? []) as ClaudeCodeSession[];
  const project = data?.project as { projectPath: string } | null;

  return (
    <SessionPageLayout
      title={project?.projectPath ?? "Project"}
      sessionCount={sessions.length}
      invalidateQueryKey={queryKey}
    >
      {sessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="break-words overflow-ellipsis line-clamp-2 text-lg flex-1 min-w-0">
                {getSessionTitle(session, "claude-code")}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {formatCost(session.meta.cost.totalUsd)}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {session.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {session.meta.messageCount} messages
            </p>
            <p className="text-sm text-muted-foreground">
              Last modified:{" "}
              {new Date(session.lastModifiedAt).toLocaleDateString()}
            </p>
            {session.meta.modelName && (
              <Badge variant="outline" className="text-xs">
                {session.meta.modelName}
              </Badge>
            )}
          </CardContent>
          <CardContent className="pt-0">
            <Button asChild className="w-full">
              <Link
                href={`/projects/claude-code/${projectId}/sessions/${session.id}`}
              >
                View Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </SessionPageLayout>
  );
}

function SessionPageLayout({
  title,
  subtitle,
  sessionCount,
  invalidateQueryKey,
  children,
}: {
  title: string;
  subtitle?: string;
  sessionCount: number;
  invalidateQueryKey: readonly unknown[];
  children: React.ReactNode;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/projects" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Projects
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <FolderIcon className="w-6 h-6 flex-shrink-0" />
          <h1 className="text-2xl md:text-3xl font-bold break-words overflow-hidden">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-muted-foreground font-mono text-sm break-all">
            Workspace Path: {subtitle}
          </p>
        )}
      </header>

      <main>
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Conversation Sessions{" "}
            {sessionCount > 0 ? `(${sessionCount})` : ""}
          </h2>

          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <div className="mb-6">
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between mb-2 h-auto py-3"
                >
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    <span className="font-medium">Filter Settings</span>
                    <span className="text-xs text-muted-foreground">
                      ({sessionCount} sessions)
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${
                      isSettingsOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <SettingsControls
                    invalidateQueryKey={invalidateQueryKey}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {sessionCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquareIcon className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No conversation sessions found for this project.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">{children}</div>
          )}
        </section>
      </main>
    </>
  );
}

export default function ProjectSessionsPage() {
  const params = useParams();
  const source = params["source"] as string;
  const projectId = params["projectId"] as string;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {source === "codex" ? (
        <CodexSessionList projectId={projectId} />
      ) : (
        <ClaudeCodeSessionList projectId={projectId} />
      )}
    </div>
  );
}
