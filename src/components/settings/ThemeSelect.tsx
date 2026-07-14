"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  useThemeStore,
  type ThemePreference,
} from "@/stores/theme-store";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
  preview: string;
}[] = [
  { value: "system", label: "Système", icon: Monitor, preview: "bg-gradient-to-br from-zinc-200 to-zinc-700" },
  { value: "light", label: "Clair", icon: Sun, preview: "bg-zinc-100" },
  { value: "dark", label: "Sombre", icon: Moon, preview: "bg-zinc-800" },
];

export function ThemeSelect() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="flex w-full gap-1 rounded-lg bg-muted p-1"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon, preview }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-md px-2 py-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "size-5 rounded border border-border/60",
                preview
              )}
              aria-hidden
            />
            <span className="flex items-center gap-1">
              <Icon className="size-3.5 shrink-0" />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
