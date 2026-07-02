"use client";

import { useEffect } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEnabledModelNames } from "@/lib/ollama/models";
import { useOllamaStore } from "@/stores/ollama-store";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

type ModelPickerProps = {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
};

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
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

  return (
    <div className="relative">
      <select
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || !online || enabledNames.length === 0}
        className={cn(
          "h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
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
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
      </Button>
    </div>
  );
}
