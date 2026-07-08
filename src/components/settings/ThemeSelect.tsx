"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import {
  useThemeStore,
  type ThemePreference,
} from "@/stores/theme-store";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}[] = [
  { value: "system", label: "Système", icon: Monitor },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

export function ThemeSelect() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15"
        )}
      >
        <span className="flex items-center gap-2">
          <CurrentIcon className="size-4 text-muted-foreground" />
          {current.label}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                theme === value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
