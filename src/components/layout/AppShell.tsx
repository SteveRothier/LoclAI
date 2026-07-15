"use client";

import { useEffect, useLayoutEffect } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ToastContainer } from "@/components/ui/toast";
import { OverlayDeepLinks } from "@/hooks/use-overlay-deep-links";
import { useSettingsShortcut } from "@/hooks/use-settings-shortcut";
import { useSettingsStore } from "@/stores/settings-store";
import { useOllamaStore } from "@/stores/ollama-store";
import { initUIStore, useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  useLayoutEffect(() => {
    initUIStore();
  }, []);

  useSettingsShortcut();

  useEffect(() => {
    void useSettingsStore.getState().load();
    void useOllamaStore.getState().init();
    useOllamaStore.getState().startPolling();
    return () => useOllamaStore.getState().stopPolling();
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <div
        className={cn(
          "sidebar-shell shrink-0",
          sidebarOpen ? "w-[260px]" : "w-[52px]"
        )}
        suppressHydrationWarning
      >
        <Sidebar />
      </div>
      <main className="flex min-w-0 flex-1 flex-col bg-background">{children}</main>
      <SettingsDialog />
      <ToastContainer />
      <OverlayDeepLinks />
    </div>
  );
}
