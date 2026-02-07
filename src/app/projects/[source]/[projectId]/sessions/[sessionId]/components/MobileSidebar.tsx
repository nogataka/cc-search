"use client";

import { MessageSquareIcon, SettingsIcon, XIcon } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionsTab } from "./SessionsTab";
import { SettingsTab } from "./SettingsTab";

type SessionItem = {
  id: string;
  title: string;
  messageCount?: number;
  lastModifiedAt: string | null;
};

interface MobileSidebarProps {
  currentSessionId: string;
  source: string;
  projectId: string;
  sessions: SessionItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar: FC<MobileSidebarProps> = ({
  currentSessionId,
  source,
  projectId,
  sessions,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"sessions" | "settings">(
    "sessions",
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
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

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 transition-all duration-300 ease-out md:hidden",
        isOpen
          ? "visible opacity-100"
          : "invisible opacity-0 pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={handleBackdropClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out flex",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Tab Icons */}
        <div className="w-12 flex flex-col border-r border-sidebar-border bg-sidebar/50">
          <div className="flex flex-col p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                activeTab === "sessions"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70",
              )}
            >
              <MessageSquareIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                activeTab === "settings"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70",
              )}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-sm">
            <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-sidebar-accent/50"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
