"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { Send, Settings2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/ollama/ModelPicker";
import { CHAT_CONTENT_CLASS, CHAT_PADDING_CLASS } from "@/lib/chat-layout";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  model: string;
  onModelChange: (model: string) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  settingsPanel?: ReactNode;
  contextNotice?: string;
};

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  disabled,
  placeholder = "Envoyer un message…",
  model,
  onModelChange,
  showSettings,
  onToggleSettings,
  settingsPanel,
  contextNotice,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className={cn("shrink-0 bg-background py-4 sm:py-5", CHAT_PADDING_CLASS)}>
      <div className={CHAT_CONTENT_CLASS}>
        {contextNotice && (
          <p className="mb-2 text-center text-xs text-amber-700">{contextNotice}</p>
        )}

        {showSettings && settingsPanel && (
          <div className="mb-3 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            {settingsPanel}
          </div>
        )}

        <div
          className={cn(
            "overflow-visible rounded-2xl border border-border bg-input shadow-sm transition-colors",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
          )}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || streaming}
            rows={1}
            className={cn(
              "max-h-40 min-h-10 w-full resize-none bg-transparent px-4 py-2.5 text-sm leading-normal text-foreground outline-none",
              "placeholder:text-muted-foreground field-sizing-content",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-0.5">
            <div className="flex min-w-0 items-center gap-0.5">
              <ModelPicker
                variant="composer"
                value={model}
                onChange={onModelChange}
                disabled={streaming || disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onToggleSettings}
                title="Paramètres de conversation"
                className={cn(
                  "size-7 shrink-0 text-muted-foreground",
                  showSettings && "bg-secondary text-foreground"
                )}
              >
                <Settings2 className="size-4" />
              </Button>
            </div>

            {streaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                onClick={onStop}
                title="Arrêter la génération"
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                onClick={onSubmit}
                disabled={disabled || !value.trim()}
                title="Envoyer (Entrée)"
              >
                <Send className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Les modèles peuvent faire des erreurs. Envisagez de vérifier les informations
          importantes. · Entrée pour envoyer · Maj+Entrée pour un saut de ligne
        </p>
      </div>
    </div>
  );
}
