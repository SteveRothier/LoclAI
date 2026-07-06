"use client";

import { Badge } from "@/components/ui/badge";
import { useOllamaStore } from "@/stores/ollama-store";
import { cn } from "@/lib/utils";

export function OllamaStatusBadge({ compact = false }: { compact?: boolean }) {
  const online = useOllamaStore((s) => s.online);
  const error = useOllamaStore((s) => s.error);

  if (compact) {
    return (
      <Badge
        variant={online ? "success" : "warning"}
        className={cn("text-[10px]")}
        title={error ?? undefined}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            online ? "bg-primary" : "bg-amber-500"
          )}
        />
        {online ? "Ollama actif" : "Hors ligne"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="sidebar"
      className="w-full justify-center"
      title={error ?? undefined}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          online ? "bg-primary" : "bg-amber-500"
        )}
      />
      {online ? "Ollama actif" : "Ollama hors ligne"}
    </Badge>
  );
}
