"use client";

import {
  MessageSquareIcon,
  SettingsIcon,
  Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FC, useState } from "react";
import { cn } from "@/lib/utils";
import { MobileSidebar } from "./MobileSidebar";
import { SessionsTab } from "./SessionsTab";
import { SettingsTab } from "./SettingsTab";

type SessionItem = {
  id: string;
  title: string;
  messageCount?: number;
  lastModifiedAt: string | null;
};

export const SessionSidebar: FC<{
  currentSessionId: string;
  source: string;
  projectId: string;
  sessions: SessionItem[];
  className?: string;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}> = ({
  currentSessionId,
  source,
  projectId,
  sessions,
  className,
  isMobileOpen = false,
  onMobileOpenChange,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sessions" | "settings">(
    "sessions",
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTabClick = (tab: "sessions" | "settings") => {
    if (activeTab === tab && isExpanded) {
      setIsExpanded(false);
    } else {
      setActiveTab(tab);
      setIsExpanded(true);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "sessions":
        return (
          <SessionsTab
            sessions={sessions}
            currentSessionId={currentSessionId}
            source={source}
            projectId={projectId}
          />
        );
      case "settings":
        return <SettingsTab />;
      default:
        return null;
    }
  };

  const sidebarContent = (
    <div
      className={cn(
        "h-full border-r border-sidebar-border transition-all duration-300 ease-in-out flex bg-sidebar text-sidebar-foreground",
        isExpanded ? "w-72 lg:w-80" : "w-12",
      )}
    >
      {/* Vertical Icon Menu */}
      <div className="w-12 flex flex-col border-r border-sidebar-border bg-sidebar/50">
        <div className="flex flex-col p-2 space-y-1">
          <button
            type="button"
            onClick={() => {
              router.push(`/projects/${source}/${projectId}`);
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "text-sidebar-foreground/70",
            )}
            title="Back to Project"
          >
            <Undo2Icon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("sessions")}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              activeTab === "sessions" && isExpanded
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70",
            )}
            title="Sessions"
          >
            <MessageSquareIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("settings")}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              activeTab === "settings" && isExpanded
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70",
            )}
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex h-full", className)}>
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        currentSessionId={currentSessionId}
        source={source}
        projectId={projectId}
        sessions={sessions}
        isOpen={isMobileOpen}
        onClose={() => onMobileOpenChange?.(false)}
      />
    </>
  );
};
