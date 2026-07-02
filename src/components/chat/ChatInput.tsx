"use client";

import { useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  disabled,
  placeholder = "Envoyer un message…",
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
    <div className="shrink-0 border-t border-border bg-background px-6 py-5">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || streaming}
          rows={1}
          className={cn(
            "max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-border bg-input px-4 py-3 text-sm text-foreground outline-none transition-colors",
            "placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15",
            "field-sizing-content disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        {streaming ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            onClick={onStop}
            title="Arrêter la génération"
          >
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            title="Envoyer (Entrée)"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
        Entrée pour envoyer · Maj+Entrée pour un saut de ligne
      </p>
    </div>
  );
}
