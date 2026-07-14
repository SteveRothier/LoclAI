"use client";

import { Bot, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Persona } from "@/lib/db/schema";

type PersonasEditorProps = {
  personas: Persona[];
  onChange: (personas: Persona[]) => void;
};

function PersonaAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function PersonasEditor({ personas, onChange }: PersonasEditorProps) {
  const updatePersona = (id: string, updates: Partial<Persona>) => {
    onChange(
      personas.map((persona) =>
        persona.id === id ? { ...persona, ...updates } : persona
      )
    );
  };

  const addPersona = () => {
    onChange([
      ...personas,
      {
        id: crypto.randomUUID(),
        name: "Nouvel assistant",
        systemPrompt: "Tu es un assistant utile. Réponds en français.",
      },
    ]);
  };

  const removePersona = (id: string) => {
    if (personas.length <= 1) return;
    onChange(personas.filter((persona) => persona.id !== id));
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
    <div className="space-y-4">
      {personas.map((persona) => (
        <div
          key={persona.id}
          className="overflow-hidden rounded-xl border border-border bg-muted/20"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <PersonaAvatar name={persona.name} />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`persona-name-${persona.id}`}
                className="sr-only"
              >
                Nom
              </label>
              <Input
                id={`persona-name-${persona.id}`}
                value={persona.name}
                onChange={(e) => updatePersona(persona.id, { name: e.target.value })}
                placeholder="Nom de l'assistant"
                className="border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removePersona(persona.id)}
              disabled={personas.length <= 1}
              title="Supprimer l'assistant"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5 p-4">
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
              rows={3}
              placeholder="System prompt"
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addPersona}>
        <Plus className="size-4" />
        Ajouter un assistant
      </Button>
    </div>
  );
}
