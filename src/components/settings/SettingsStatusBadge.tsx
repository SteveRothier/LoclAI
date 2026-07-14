"use client";

import { Badge } from "@/components/ui/badge";
import { useOllamaStore } from "@/stores/ollama-store";

export function SettingsStatusBadge() {
  const online = useOllamaStore((s) => s.online);

  return (
    <Badge variant={online ? "success" : "warning"}>
      <span
        className={`size-1.5 rounded-full ${online ? "bg-primary" : "bg-amber-500"}`}
        aria-hidden
      />
      {online ? "Connecté" : "Hors ligne"}
    </Badge>
  );
}
