"use client";

import { useEffect } from "react";
import { initThemeStore, enableThemeTransitions, subscribeToSystemTheme } from "@/stores/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initThemeStore();
    enableThemeTransitions();
    return subscribeToSystemTheme();
  }, []);

  return children;
}
