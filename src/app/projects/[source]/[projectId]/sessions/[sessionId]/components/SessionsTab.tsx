"use client";

import { MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { cn } from "@/lib/utils";

type SessionItem = {
  id: string;
  title: string;
  messageCount?: number;
  lastModifiedAt: string | null;
};

export const SessionsTab: FC<{
  sessions: SessionItem[];
  currentSessionId: string;
  source: string;
  projectId: string;
}> = ({ sessions, currentSessionId, source, projectId }) => {
  const sortedSessions = [...sessions].sort((a, b) => {
    const aTime = a.lastModifiedAt
      ? new Date(a.lastModifiedAt).getTime()
      : 0;
    const bTime = b.lastModifiedAt
      ? new Date(b.lastModifiedAt).getTime()
      : 0;
    return bTime - aTime;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-sidebar-border p-4">
        <h2 className="font-semibold text-lg">Sessions</h2>
        <p className="text-xs text-sidebar-foreground/70">
          {sessions.length} total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sortedSessions.map((session) => {
          const isActive = session.id === currentSessionId;

          return (
            <Link
              key={session.id}
              href={`/projects/${source}/${projectId}/sessions/${encodeURIComponent(session.id)}`}
              className={cn(
                "block rounded-lg p-2.5 transition-all duration-200 hover:bg-blue-50/60 hover:border-blue-300/60 hover:shadow-sm border border-sidebar-border/40 bg-sidebar/30",
                isActive &&
                  "bg-blue-100 border-blue-400 shadow-md ring-1 ring-blue-200/50 hover:bg-blue-100 hover:border-blue-400",
              )}
            >
              <div className="space-y-1.5">
                <h3 className="text-sm font-medium line-clamp-2 leading-tight text-sidebar-foreground">
                  {session.title}
                </h3>
                <div className="flex items-center justify-between">
                  {session.messageCount != null && (
                    <div className="flex items-center gap-1 text-xs text-sidebar-foreground/70">
                      <MessageSquareIcon className="w-3 h-3" />
                      <span>{session.messageCount}</span>
                    </div>
                  )}
                  {session.lastModifiedAt && (
                    <span className="text-xs text-sidebar-foreground/60">
                      {new Date(session.lastModifiedAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
