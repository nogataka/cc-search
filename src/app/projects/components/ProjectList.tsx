"use client";

import { basename } from "node:path";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  FolderIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2,
  MessageSquareIcon,
} from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { honoClient } from "../../../lib/api/client";

type ProjectItem = {
  id: string;
  name: string;
  path: string;
  sessionCount: number;
  lastSessionAt: Date | null;
};

type SortKey = "lastModified" | "name" | "messageCount";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";

export const ClaudeCodeProjectList: FC = () => {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["claude-code-projects"],
    queryFn: async () => {
      const res = await honoClient.api["claude-code"].projects.$get();
      const data = await res.json();
      return (
        data.projects as Array<{
          id: string;
          projectPath: string;
          meta: { sessionCount: number; lastSessionDate: string | null };
        }>
      ).map(
        (p): ProjectItem => ({
          id: p.id,
          name: basename(p.projectPath),
          path: p.projectPath,
          sessionCount: p.meta.sessionCount,
          lastSessionAt: p.meta.lastSessionDate
            ? new Date(p.meta.lastSessionDate)
            : null,
        }),
      );
    },
  });

  return (
    <ProjectListView
      projects={projects}
      isLoading={isLoading}
      source="claude-code"
      emptyMessage="No Claude Code projects found. Run a Claude Code conversation to populate this list."
    />
  );
};

export const CodexProjectList: FC = () => {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["codex-projects"],
    queryFn: async () => {
      const res = await honoClient.api.codex.projects.$get();
      const data = await res.json();
      return (
        data.projects as Array<{
          id: string;
          workspacePath: string;
          meta: {
            workspaceName: string;
            workspacePath: string;
            sessionCount: number;
            lastSessionAt: string | null;
          };
        }>
      ).map(
        (p): ProjectItem => ({
          id: p.id,
          name: p.meta.workspaceName ?? basename(p.workspacePath),
          path: p.meta.workspacePath ?? p.workspacePath,
          sessionCount: p.meta.sessionCount,
          lastSessionAt: p.meta.lastSessionAt
            ? new Date(p.meta.lastSessionAt)
            : null,
        }),
      );
    },
  });

  return (
    <ProjectListView
      projects={projects}
      isLoading={isLoading}
      source="codex"
      emptyMessage="No Codex projects found. Run a Codex conversation to populate this list."
    />
  );
};

const ProjectListView: FC<{
  projects: ProjectItem[];
  isLoading: boolean;
  source: "codex" | "claude-code";
  emptyMessage: string;
}> = ({ projects, isLoading, source, emptyMessage }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastModified");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? projects.filter((project) => {
          return (
            project.name.toLowerCase().includes(normalizedQuery) ||
            project.path.toLowerCase().includes(normalizedQuery)
          );
        })
      : projects;

    const sorted = [...filtered].sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;

      if (sortKey === "name") {
        return direction * a.name.localeCompare(b.name);
      }

      if (sortKey === "messageCount") {
        return direction * (a.sessionCount - b.sessionCount);
      }

      const aTime = a.lastSessionAt?.getTime() ?? 0;
      const bTime = b.lastSessionAt?.getTime() ?? 0;
      return direction * (aTime - bTime);
    });

    return sorted;
  }, [projects, searchQuery, sortKey, sortOrder]);

  const handleToggleSortOrder = () => {
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isFilteredResultEmpty = filteredProjects.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            placeholder="Filter by project name or path"
            className="w-full sm:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Select
              value={sortKey}
              onValueChange={(value) => {
                setSortKey(value as SortKey);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastModified">Last modified</SelectItem>
                <SelectItem value="name">Project name</SelectItem>
                <SelectItem value="messageCount">Session count</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleSortOrder}
              aria-label={`Toggle sort order (${sortOrder})`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGridIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isFilteredResultEmpty ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No projects match the current filters.
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderIcon className="w-5 h-5" />
                  <span className="truncate">{project.name}</span>
                </CardTitle>
                <CardDescription>{project.path}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Last modified:{" "}
                  {project.lastSessionAt
                    ? project.lastSessionAt.toLocaleString()
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquareIcon className="h-3 w-3" />
                  {project.sessionCount}
                </p>
              </CardContent>
              <CardContent className="pt-0">
                <Button asChild className="w-full">
                  <Link href={`/projects/${source}/${project.id}`}>
                    View Sessions
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Path</th>
                <th className="px-4 py-3 text-left font-medium">
                  Last modified
                </th>
                <th className="px-4 py-3 text-left font-medium">Sessions</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects.map((project) => {
                const lastModified = project.lastSessionAt
                  ? project.lastSessionAt.toLocaleString()
                  : "";

                return (
                  <tr key={project.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("rounded-md border p-2")}>
                          <FolderIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {project.path}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lastModified}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="inline-flex items-center gap-1">
                        <MessageSquareIcon className="h-3 w-3" />
                        {project.sessionCount}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm">
                        <Link href={`/projects/${source}/${project.id}`}>
                          View Sessions
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
