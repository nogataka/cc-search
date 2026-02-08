"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ArrowLeft,
  Bot,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FolderIcon,
  Loader2,
  Search as SearchIcon,
  User,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { honoClient } from "../../lib/api/client";

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

const RECENT_SEARCHES_KEY = "cc-search-recent-queries";
const MAX_RECENT_SEARCHES = 8;

const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

const addRecentSearch = (q: string) => {
  const recent = getRecentSearches().filter((s) => s !== q);
  recent.unshift(q);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)),
  );
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

const getProjectName = (path: string) => {
  return path.split("/").pop() ?? path;
};

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [searchCodex, setSearchCodex] = useState(true);
  const [searchClaudeCode, setSearchClaudeCode] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(0);

  const [selectedProjectPath, setSelectedProjectPath] = useState<
    string | undefined
  >(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePresetLabel, setDatePresetLabel] = useState<string>("すべて");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // Fetch all projects for the dropdown
  const { data: projectsData } = useQuery({
    queryKey: ["all-projects"],
    queryFn: async () => {
      const res = await honoClient.api.projects.all.$get();
      return res.json();
    },
  });

  const fetchResults = useCallback(
    async (searchQuery: string, offset: number) => {
      const sources: ("codex" | "claude-code")[] = [];
      if (searchCodex) sources.push("codex");
      if (searchClaudeCode) sources.push("claude-code");

      if (sources.length === 0) {
        setResults([]);
        setTotal(0);
        setHasSearched(true);
        return;
      }

      setIsSearching(true);
      try {
        const res = await honoClient.api.search.$post({
          json: {
            query: searchQuery,
            sources,
            limit: PER_PAGE,
            offset,
            projectPath: selectedProjectPath,
            startDate: dateRange?.from?.toISOString(),
            endDate: dateRange?.to?.toISOString(),
          },
        });
        const data = await res.json();
        setResults(data.results as SearchResult[]);
        setTotal(data.total);
        addRecentSearch(searchQuery);
        setRecentSearches(getRecentSearches());
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
        setTotal(0);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    },
    [searchCodex, searchClaudeCode, selectedProjectPath, dateRange],
  );

  // Auto-search on mount if query param exists
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (initialQuery.trim() && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      void fetchResults(initialQuery.trim(), 0);
    }
  }, [initialQuery, fetchResults]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setPage(0);
    // Update URL with the query
    router.replace(`/search?q=${encodeURIComponent(query.trim())}`, {
      scroll: false,
    });
    await fetchResults(query.trim(), 0);
  };

  const handlePageChange = async (newPage: number) => {
    setPage(newPage);
    await fetchResults(query.trim(), newPage * PER_PAGE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSuggestionClick = async (term: string) => {
    setQuery(term);
    setPage(0);
    router.replace(`/search?q=${encodeURIComponent(term)}`, { scroll: false });
    await fetchResults(term, 0);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold">会話履歴を検索</h1>
          <p className="text-muted-foreground">
            Claude Code・Codexの会話ログをキーワードや条件で横断検索
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-3xl mb-8 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="キーワードを入力して検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
              <span className="ml-2">検索</span>
            </Button>
          </form>

          {/* Tool Checkboxes */}
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground font-medium">
              ソース:
            </span>
            <div className="flex items-center gap-2">
              <Checkbox
                id="search-claude-code"
                checked={searchClaudeCode}
                onCheckedChange={(checked) =>
                  setSearchClaudeCode(checked === true)
                }
              />
              <label
                htmlFor="search-claude-code"
                className="text-sm cursor-pointer"
              >
                Claude Code
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="search-codex"
                checked={searchCodex}
                onCheckedChange={(checked) => setSearchCodex(checked === true)}
              />
              <label htmlFor="search-codex" className="text-sm cursor-pointer">
                Codex
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground block">
                プロジェクト
              </span>
              <Select
                value={selectedProjectPath ?? "__all__"}
                onValueChange={(v) =>
                  setSelectedProjectPath(v === "__all__" ? undefined : v)
                }
              >
                <SelectTrigger className="w-64">
                  <FolderIcon className="h-4 w-4 mr-2 opacity-50" />
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">すべて</SelectItem>
                  {projectsData?.projects.map(
                    (p: { path: string; sources: string[] }) => (
                      <SelectItem key={p.path} value={p.path}>
                        {getProjectName(p.path)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground block">
                期間
              </span>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-72 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2 opacity-50" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span>
                          {format(dateRange.from, "yyyy/MM/dd")} -{" "}
                          {format(dateRange.to, "yyyy/MM/dd")}
                        </span>
                      ) : (
                        <span>{format(dateRange.from, "yyyy/MM/dd")} -</span>
                      )
                    ) : (
                      <span>{datePresetLabel}</span>
                    )}
                    {dateRange && (
                      <XIcon
                        className="h-3.5 w-3.5 ml-auto opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateRange(undefined);
                          setDatePresetLabel("すべて");
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-1 p-3 pb-0 flex-wrap">
                    {[
                      { label: "過去7日", days: 7 },
                      { label: "過去30日", days: 30 },
                      { label: "過去90日", days: 90 },
                      { label: "過去1年", days: 365 },
                    ].map((preset) => (
                      <Button
                        key={preset.days}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          setDateRange({
                            from: subDays(today, preset.days),
                            to: today,
                          });
                          setDatePresetLabel(preset.label);
                          setIsCalendarOpen(false);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setDateRange(undefined);
                        setDatePresetLabel("すべて");
                        setIsCalendarOpen(false);
                      }}
                    >
                      クリア
                    </Button>
                  </div>
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      setDatePresetLabel(
                        range?.from
                          ? `${format(range.from, "yyyy/MM/dd")}${range.to ? ` - ${format(range.to, "yyyy/MM/dd")}` : ""}`
                          : "すべて",
                      );
                      if (range?.from && range?.to) {
                        setIsCalendarOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    locale={ja}
                    disabled={{ after: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Recent Search Suggestions */}
          {!hasSearched && recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">最近の検索:</span>
              {recentSearches.map((term) => (
                <Button
                  key={term}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => void handleSuggestionClick(term)}
                >
                  {term}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {isSearching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasSearched ? (
          results.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{total}</strong> 件の結果
                  {totalPages > 1 && ` (ページ ${page + 1} / ${totalPages})`}
                </p>
              </div>
              {results.map((result, index) => (
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
                          {result.source === "codex" ? "Codex" : "Claude Code"}
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
                      <CardDescription className="text-xs font-mono truncate">
                        {result.projectPath}
                      </CardDescription>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => void handlePageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    前へ
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => void handlePageChange(page + 1)}
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
              <p>「{query}」に一致する結果が見つかりませんでした</p>
              <p className="text-sm mt-2">
                別のキーワードやフィルタ条件で試してみてください
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>キーワードを入力して会話履歴を検索</p>
            <p className="text-sm mt-2">
              ユーザーメッセージとアシスタントの応答を横断的に検索できます
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
