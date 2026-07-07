"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Persona } from "@/lib/db/schema";

type PersonasEditorProps = {
  personas: Persona[];
  onChange: (personas: Persona[]) => void;
};

export function PersonasEditor({ personas, onChange }: PersonasEditorProps) {
  const updatePersona = (id: string, updates: Partial<Persona>) => {
    onChange(personas.map((persona) => (persona.id === id ? { ...persona, ...updates } : persona)));
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

  return (
    <div className="space-y-4">
      {personas.map((persona) => (
        <div key={persona.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Input
              value={persona.name}
              onChange={(e) => updatePersona(persona.id, { name: e.target.value })}
              placeholder="Nom de l'assistant"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removePersona(persona.id)}
              disabled={personas.length <= 1}
              title="Supprimer l'assistant"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Textarea
            value={persona.systemPrompt}
            onChange={(e) => updatePersona(persona.id, { systemPrompt: e.target.value })}
            rows={3}
            placeholder="System prompt"
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addPersona}>
        <Plus className="size-4" />
        Ajouter un assistant
      </Button>
    </div>
  );
}
