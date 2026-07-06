"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSettingsStore } from "@/stores/settings-store";
import { useOllamaStore } from "@/stores/ollama-store";
import { initUIStore, useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH_OPEN = "w-[260px]";
const SIDEBAR_WIDTH_COLLAPSED = "w-[52px]";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  useEffect(() => {
    initUIStore();
    void useSettingsStore.getState().load();
    void useOllamaStore.getState().init();
    useOllamaStore.getState().startPolling();
    return () => useOllamaStore.getState().stopPolling();
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <div
        className={cn(
          "shrink-0 transition-[width] duration-200 ease-in-out",
          sidebarOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_COLLAPSED
        )}
      >
        <Sidebar />
      </div>
      <main className="flex min-w-0 flex-1 flex-col bg-background">{children}</main>
    </div>
  );
}
