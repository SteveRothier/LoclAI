"use client";

import type { Persona } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type PersonaSelectProps = {
  personas: Persona[];
  value: string;
  onChange: (persona: Persona) => void;
  disabled?: boolean;
  className?: string;
};

export function PersonaSelect({
  personas,
  value,
  onChange,
  disabled,
  className,
}: PersonaSelectProps) {
  const selectedId =
    personas.find((persona) => persona.systemPrompt === value)?.id ??
    personas[0]?.id ??
    "";

  return (
    <select
      value={selectedId}
      disabled={disabled || personas.length === 0}
      onChange={(event) => {
        const persona = personas.find((item) => item.id === event.target.value);
        if (persona) onChange(persona);
      }}
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none",
        "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {personas.map((persona) => (
        <option key={persona.id} value={persona.id}>
          {persona.name}
        </option>
      ))}
    </select>
  );
}
