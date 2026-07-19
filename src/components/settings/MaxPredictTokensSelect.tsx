"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TOKEN_OPTIONS: { value: number; label: string }[] = [
  { value: -1, label: "Infini" },
  { value: 512, label: "512" },
  { value: 1024, label: "1 024" },
  { value: 2048, label: "2 048" },
  { value: 4096, label: "4 096" },
  { value: 8192, label: "8 192" },
  { value: 16384, label: "16 384" },
  { value: 32768, label: "32 768" },
];

function labelFor(value: number): string {
  return (
    TOKEN_OPTIONS.find((option) => option.value === value)?.label ??
    value.toLocaleString("fr-FR")
  );
}

type MaxPredictTokensSelectProps = {
  value: number;
  onChange: (value: number) => void;
};

export function MaxPredictTokensSelect({
  value,
  onChange,
}: MaxPredictTokensSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options =
    TOKEN_OPTIONS.some((option) => option.value === value)
      ? TOKEN_OPTIONS
      : [...TOKEN_OPTIONS, { value, label: labelFor(value) }].sort(
          (a, b) => a.value - b.value
        );

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
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15"
        )}
      >
        <span>{labelFor(value)}</span>
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
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg scrollbar-none"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                value === option.value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.value && (
                <Check className="size-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
