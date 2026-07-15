"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { getEnabledModelNames } from "@/lib/ollama/models";
import { useOllamaStore } from "@/stores/ollama-store";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

type ModelPickerProps = {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  variant?: "default" | "composer";
};

type ModelPickerState = {
  online: boolean;
  enabledNames: string[];
  selectValue: string;
  displayLabel: string;
};

function useModelPickerState(
  value: string,
  onChange: (model: string) => void
): ModelPickerState {
  const models = useOllamaStore((s) => s.models);
  const online = useOllamaStore((s) => s.online);
  const disabledModels = useSettingsStore((s) => s.settings?.disabledModels ?? []);

  useEffect(() => {
    void useOllamaStore.getState().refresh();
  }, []);

  const enabledNames = getEnabledModelNames(models, disabledModels);
  const selectValue = enabledNames.includes(value) ? value : (enabledNames[0] ?? "");

  useEffect(() => {
    if (selectValue && selectValue !== value) {
      onChange(selectValue);
    }
  }, [selectValue, value, onChange]);

  const displayLabel = !online
    ? value || "Ollama hors ligne"
    : enabledNames.length === 0
      ? value || "Aucun modèle actif"
      : selectValue;

  return { online, enabledNames, selectValue, displayLabel };
}

function ComposerModelPicker({
  disabled,
  onChange,
  state,
}: {
  disabled?: boolean;
  onChange: (model: string) => void;
  state: ModelPickerState;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { online, enabledNames, selectValue, displayLabel } = state;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
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

  const isDisabled = disabled || !online || enabledNames.length === 0;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-7 max-w-[9rem] items-center gap-0.5 rounded-md bg-transparent pl-2 pr-1 text-xs text-muted-foreground transition-colors sm:max-w-[11rem]",
          "hover:bg-secondary/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          open && "bg-secondary/80 text-foreground"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && enabledNames.length > 0 && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-1 w-max min-w-full max-w-[11rem] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          <div className="max-h-48 overflow-y-auto scrollbar-none">
            {enabledNames.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === selectValue}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-secondary",
                  name === selectValue
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground"
                )}
              >
                <span className="truncate">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultModelPicker({
  disabled,
  onChange,
  state,
}: {
  disabled?: boolean;
  onChange: (model: string) => void;
  state: ModelPickerState;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { online, enabledNames, selectValue, displayLabel } = state;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
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

  const isDisabled = disabled || !online || enabledNames.length === 0;

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <button
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && enabledNames.length > 0 && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          <div className="max-h-48 overflow-y-auto scrollbar-none">
            {enabledNames.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === selectValue}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  name === selectValue ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="flex-1 truncate">{name}</span>
                {name === selectValue && (
                  <Check className="size-4 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ModelPicker({
  value,
  onChange,
  disabled,
  variant = "default",
}: ModelPickerProps) {
  const state = useModelPickerState(value, onChange);

  if (variant === "composer") {
    return (
      <ComposerModelPicker disabled={disabled} onChange={onChange} state={state} />
    );
  }

  return (
    <DefaultModelPicker
      disabled={disabled}
      onChange={onChange}
      state={state}
    />
  );
}

export function ModelPickerButton({ value, onChange, disabled }: ModelPickerProps) {
  const refreshing = useOllamaStore((s) => s.refreshing);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Modèle</span>
      <ModelPicker value={value} onChange={onChange} disabled={disabled} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void useOllamaStore.getState().refresh()}
        title="Rafraîchir les modèles"
        disabled={disabled || refreshing}
      >
        {refreshing ? (
          <Loader variant="ring" size="sm" />
        ) : (
          <RefreshCw className="size-4" />
        )}
      </Button>
    </div>
  );
}
