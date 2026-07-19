/**
 * True when Python `if __name__ == "__main__":` is present but has no body.
 */
export function hasEmptyMainBlock(text: string): boolean {
  const idx = text.search(/if\s+__name__\s*==\s*['"]__main__['"]\s*:/);
  if (idx < 0) return false;

  const after = text.slice(idx);
  const bodyLines = after
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "```" && !l.startsWith("```"));

  return bodyLines.length === 0;
}

const CONTINUE_MAIN_PROMPT =
  "Continue exactement après le dernier caractère. Complète le bloc if __name__ == \"__main__\": (corps indenté), puis ferme le fence markdown s'il est ouvert. Aucune excuse, aucun préambule, aucune répétition.";

const TAIL_CHARS = 4000;

export function buildEmptyMainContinuationMessages(
  baseMessages: { role: "system" | "user" | "assistant"; content: string }[],
  partialAssistant: string
): { role: "system" | "user" | "assistant"; content: string }[] {
  const system = baseMessages.filter((m) => m.role === "system");
  const lastUser = [...baseMessages].reverse().find((m) => m.role === "user");
  const tail =
    partialAssistant.length > TAIL_CHARS
      ? partialAssistant.slice(-TAIL_CHARS)
      : partialAssistant;

  return [
    ...system,
    ...(lastUser ? [lastUser] : []),
    { role: "assistant", content: tail },
    { role: "user", content: CONTINUE_MAIN_PROMPT },
  ];
}

/** Append next chunk; strip short prefix overlap if the model repeats the tail. */
export function appendContinuation(base: string, next: string): string {
  if (!next) return base;
  if (!base) return next;

  const max = Math.min(base.length, next.length, 80);
  for (let n = max; n >= 4; n--) {
    if (next.startsWith(base.slice(-n))) {
      return base + next.slice(n);
    }
  }
  return base + next;
}
