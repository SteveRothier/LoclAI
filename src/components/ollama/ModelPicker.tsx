"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
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
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
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
  value,
  disabled,
  onChange,
  state,
}: {
  value: string;
  disabled?: boolean;
  onChange: (model: string) => void;
  state: ModelPickerState;
}) {
  const { online, enabledNames, selectValue } = state;

  return (
    <div className="relative">
      <select
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || !online || enabledNames.length === 0}
        className={cn(
          "h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none",
          "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {!online && <option value={value}>{value || "Ollama hors ligne"}</option>}
        {online && enabledNames.length === 0 && (
          <option value="">{value || "Aucun modèle actif"}</option>
        )}
        {enabledNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
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
      value={value}
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
