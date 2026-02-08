"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  Bot,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FolderIcon,
  Loader2,
  MessageSquareIcon,
  Search as SearchIcon,
  SettingsIcon,
  User,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { Checkbox } from "../../../../components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../../components/ui/collapsible";
import { Input } from "../../../../components/ui/input";
import { honoClient } from "../../../../lib/api/client";
import { useConfig } from "../../../hooks/useConfig";

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

type SearchResult = {
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

const PER_PAGE = 20;

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

const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      title={
        project?.meta?.workspacePath ?? project?.workspacePath ?? "Project"
      }
      subtitle={project?.workspacePath ?? undefined}
      sessionCount={sessions.length}
      invalidateQueryKey={queryKey}
      projectPath={project?.workspacePath ?? ""}
      currentSource="codex"
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
                {session.meta.messageCount} メッセージ
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              最終更新:{" "}
              {session.meta.lastModifiedAt
                ? new Date(session.meta.lastModifiedAt).toLocaleDateString()
                : ""}
            </p>
            {session.meta.startedAt && (
              <p className="text-xs text-muted-foreground">
                開始: {new Date(session.meta.startedAt).toLocaleString()}
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
      projectPath={project?.projectPath ?? ""}
      currentSource="claude-code"
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
              {session.meta.messageCount} メッセージ
            </p>
            <p className="text-sm text-muted-foreground">
              最終更新:{" "}
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
  projectPath,
  currentSource,
}: {
  title: string;
  subtitle?: string;
  sessionCount: number;
  invalidateQueryKey: readonly unknown[];
  children: React.ReactNode;
  projectPath: string;
  currentSource: "codex" | "claude-code";
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Project search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCodex, setSearchCodex] = useState(currentSource === "codex");
  const [searchClaudeCode, setSearchClaudeCode] = useState(
    currentSource === "claude-code",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);

  const searchTotalPages = Math.ceil(searchTotal / PER_PAGE);

  const fetchProjectSearchResults = useCallback(
    async (q: string, offset: number) => {
      const sources: ("codex" | "claude-code")[] = [];
      if (searchCodex) sources.push("codex");
      if (searchClaudeCode) sources.push("claude-code");
      if (sources.length === 0) return;

      setIsSearching(true);
      try {
        const res = await honoClient.api.search.$post({
          json: {
            query: q,
            sources,
            limit: PER_PAGE,
            offset,
            projectPath,
          },
        });
        const data = await res.json();
        setSearchResults(data.results as SearchResult[]);
        setSearchTotal(data.total);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
        setSearchTotal(0);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    },
    [searchCodex, searchClaudeCode, projectPath],
  );

  const handleProjectSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchPage(0);
    await fetchProjectSearchResults(searchQuery.trim(), 0);
  };

  const handleSearchPageChange = async (newPage: number) => {
    setSearchPage(newPage);
    await fetchProjectSearchResults(searchQuery.trim(), newPage * PER_PAGE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setSearchTotal(0);
    setSearchPage(0);
  };

  return (
    <>
      <header className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/projects" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            プロジェクト一覧に戻る
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
            ワークスペース: {subtitle}
          </p>
        )}
      </header>

      {/* Project Search */}
      <div className="mb-6 space-y-3">
        <form onSubmit={handleProjectSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="このプロジェクト内を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SearchIcon className="h-4 w-4" />
            )}
            <span className="ml-2">検索</span>
          </Button>
          {hasSearched && (
            <Button variant="ghost" size="icon" onClick={clearSearch}>
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </form>

        <div className="flex items-center gap-6">
          <span className="text-sm text-muted-foreground font-medium">
            ソース:
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="project-search-claude-code"
              checked={searchClaudeCode}
              onCheckedChange={(checked) =>
                setSearchClaudeCode(checked === true)
              }
            />
            <label
              htmlFor="project-search-claude-code"
              className="text-sm cursor-pointer"
            >
              Claude Code
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="project-search-codex"
              checked={searchCodex}
              onCheckedChange={(checked) => setSearchCodex(checked === true)}
            />
            <label
              htmlFor="project-search-codex"
              className="text-sm cursor-pointer"
            >
              Codex
            </label>
          </div>
        </div>
      </div>

      <main>
        {/* Search Results */}
        {hasSearched ? (
          <section>
            {isSearching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{searchTotal}</strong>{" "}
                  件の結果 — {title.split("/").pop()} 内
                  {searchTotalPages > 1 &&
                    ` (ページ ${searchPage + 1} / ${searchTotalPages})`}
                </p>
                {searchResults.map((result, index) => (
                  <Link
                    key={`${result.sessionId}-${index}`}
                    href={`/projects/${result.source}/${result.projectId}/sessions/${result.sessionId}`}
                    className="block"
                  >
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              result.source === "claude-code"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {result.source === "codex"
                              ? "Codex"
                              : "Claude Code"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {result.role === "user" ? (
                              <User className="h-3 w-3 mr-1" />
                            ) : (
                              <Bot className="h-3 w-3 mr-1" />
                            )}
                            {result.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(result.timestamp)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm font-mono">
                          <span className="text-muted-foreground">
                            ...{result.contextBefore}
                          </span>
                          <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
                            {result.matchedText}
                          </mark>
                          <span className="text-muted-foreground">
                            {result.contextAfter}...
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {searchTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={searchPage === 0}
                      onClick={() =>
                        void handleSearchPageChange(searchPage - 1)
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                      前へ
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                      {searchPage + 1} / {searchTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={searchPage >= searchTotalPages - 1}
                      onClick={() =>
                        void handleSearchPageChange(searchPage + 1)
                      }
                    >
                      次へ
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>「{searchQuery}」に一致する結果が見つかりませんでした</p>
              </div>
            )}
          </section>
        ) : (
          /* Session List */
          <section>
            <h2 className="text-xl font-semibold mb-4">
              会話セッション{" "}
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
                      <span className="font-medium">フィルタ設定</span>
                      <span className="text-xs text-muted-foreground">
                        ({sessionCount} セッション)
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
                    <SettingsControls invalidateQueryKey={invalidateQueryKey} />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {sessionCount === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquareIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    セッションが見つかりません
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    このプロジェクトの会話セッションが見つかりませんでした。
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">{children}</div>
            )}
          </section>
        )}
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
