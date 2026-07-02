"use client";

import { useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOllamaStore } from "@/stores/ollama-store";
import { cn } from "@/lib/utils";

type ModelPickerProps = {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
};

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const models = useOllamaStore((s) => s.models);
  const online = useOllamaStore((s) => s.online);

  useEffect(() => {
    void useOllamaStore.getState().refresh();
  }, []);

  const modelNames = models.map((m) => m.name);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || !online || modelNames.length === 0}
        className={cn(
          "h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {!online && <option value={value}>{value || "Ollama hors ligne"}</option>}
        {online && modelNames.length === 0 && (
          <option value={value}>{value || "Aucun modèle"}</option>
        )}
        {modelNames.map((name) => (
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
        disabled={disabled}
      >
        ↻
      </Button>
    </div>
  );
}
