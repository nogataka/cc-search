"use client";

import {
  ArrowLeft,
  Bot,
  Loader2,
  Search as SearchIcon,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchCodex, setSearchCodex] = useState(true);
  const [searchClaudeCode, setSearchClaudeCode] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

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
          query: query.trim(),
          sources,
          limit: 50,
          offset: 0,
        },
      });
      const data = await res.json();
      setResults(data.results as SearchResult[]);
      setTotal(data.total);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
      setTotal(0);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
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
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold">Search Logs</h1>
          <p className="text-muted-foreground">
            Search across all conversation logs from Codex and Claude Code
          </p>
        </div>

        <Card className="max-w-2xl mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Search Options</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter search query..."
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
                  <span className="ml-2">Search</span>
                </Button>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="search-codex"
                    checked={searchCodex}
                    onCheckedChange={(checked) =>
                      setSearchCodex(checked === true)
                    }
                  />
                  <label
                    htmlFor="search-codex"
                    className="text-sm cursor-pointer"
                  >
                    Codex
                  </label>
                </div>
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
              </div>
            </form>
          </CardContent>
        </Card>

        {isSearching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasSearched ? (
          results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found {total} results
              </p>
              {results.map((result, index) => (
                <Link
                  key={`${result.sessionId}-${index}`}
                  href={`/projects/${result.source}/${result.projectId}/sessions/${result.sessionId}`}
                >
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            result.source === "codex" ? "default" : "secondary"
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
                      <CardDescription className="text-xs truncate">
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
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results found for &quot;{query}&quot;</p>
              <p className="text-sm mt-2">
                Try a different search term or select different sources.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search query to find conversations</p>
            <p className="text-sm mt-2">
              Search across user messages and assistant responses in your
              conversation logs.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
