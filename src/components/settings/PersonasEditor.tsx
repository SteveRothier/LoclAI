"use client";

import { useState } from "react";
import { Bot, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Persona } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type PersonasEditorProps = {
  personas: Persona[];
  onChange: (personas: Persona[]) => void;
};

function PersonaAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function PersonasEditor({ personas, onChange }: PersonasEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    () => personas[0]?.id ?? null
  );

  const updatePersona = (id: string, updates: Partial<Persona>) => {
    onChange(
      personas.map((persona) =>
        persona.id === id ? { ...persona, ...updates } : persona
      )
    );
  };

  const addPersona = () => {
    const id = crypto.randomUUID();
    onChange([
      ...personas,
      {
        id,
        name: "Nouvel assistant",
        systemPrompt: "Tu es un assistant utile. Réponds en français.",
      },
    ]);
    setExpandedId(id);
  };

  const removePersona = (id: string) => {
    if (personas.length <= 1) return;
    onChange(personas.filter((persona) => persona.id !== id));
    if (expandedId === id) {
      setExpandedId(personas.find((p) => p.id !== id)?.id ?? null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  if (personas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <Bot className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun assistant configuré.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={addPersona}>
          <Plus className="size-4" />
          Ajouter un assistant
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {personas.map((persona) => {
        const expanded = expandedId === persona.id;
        const panelId = `persona-panel-${persona.id}`;
        const headerId = `persona-header-${persona.id}`;

        return (
          <div
            key={persona.id}
            className="overflow-hidden rounded-xl border border-border bg-muted/20"
          >
            <div className="flex items-center gap-1 pr-1">
              <button
                type="button"
                id={headerId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggleExpanded(persona.id)}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180"
                  )}
                />
                <PersonaAvatar name={persona.name} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {persona.name.trim() || "Sans nom"}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removePersona(persona.id)}
                disabled={personas.length <= 1}
                title="Supprimer l'assistant"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {expanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="space-y-4 border-t border-border p-4"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor={`persona-name-${persona.id}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Nom
                  </label>
                  <Input
                    id={`persona-name-${persona.id}`}
                    value={persona.name}
                    onChange={(e) =>
                      updatePersona(persona.id, { name: e.target.value })
                    }
                    placeholder="Nom de l'assistant"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`persona-prompt-${persona.id}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    System prompt
                  </label>
                  <Textarea
                    id={`persona-prompt-${persona.id}`}
                    value={persona.systemPrompt}
                    onChange={(e) =>
                      updatePersona(persona.id, { systemPrompt: e.target.value })
                    }
                    rows={4}
                    placeholder="System prompt"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={addPersona}>
        <Plus className="size-4" />
        Ajouter un assistant
      </Button>
    </div>
  );
}
