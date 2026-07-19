import type { OllamaMessage } from "@/lib/ollama/client";

const CONTINUE_USER_PROMPT =
  "Continue exactement après le dernier caractère ci-dessus. Aucune excuse, aucun préambule, aucune répétition : uniquement la suite manquante.";

const CONTINUATION_TAIL_CHARS = 4500;

export const MAX_STREAM_CONTINUATIONS = 8;

/** Prefer final answer content; fall back to thinking trace if content is empty. */
export function resolveStreamDisplayContent(
  content: string,
  thinking: string
): string {
  if (content.trim()) return content;
  if (thinking.trim()) return thinking;
  return "";
}

export function hasUnclosedMarkdownFence(text: string): boolean {
  const fenceCount = (text.match(/```/g) ?? []).length;
  return fenceCount % 2 === 1;
}

export function countFencedCodeLines(text: string): number {
  let count = 0;
  let inFence = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) count += 1;
  }
  return count;
}

export function hasIncompleteMainBlock(text: string): boolean {
  const idx = text.search(/if\s+__name__\s*==\s*['"]__main__['"]\s*:/);
  if (idx < 0) return false;
  const bodyLines = text
    .slice(idx)
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "```" && !l.startsWith("```"));
  return bodyLines.length === 0;
}

/** User explicitly asked for a long / large answer. */
export function userAskedForLongOutput(messages: OllamaMessage[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return false;
  return /\b(100\s*lignes|au\s*moins\s*\d+|plus\s*de\s*\d+|très\s*long|complexe\s+et\s+long|code\s+long|long\s+et\s+complexe)\b/i.test(
    lastUser.content
  );
}

export function extractRequestedMinLines(messages: OllamaMessage[]): number | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;
  const matches = [...lastUser.content.matchAll(/(\d+)\s*lignes?/gi)];
  if (matches.length === 0) return null;
  const values = matches
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => Number.isFinite(n) && n >= 20);
  if (values.length === 0) return null;
  return Math.max(...values);
}

function lastNonEmptyLine(text: string): string {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trimEnd();
    if (line.trim()) return line;
  }
  return "";
}

function endsInsideCodeFence(text: string): boolean {
  return hasUnclosedMarkdownFence(text);
}

/**
 * Structural signs the reply was cut mid-stream.
 * Do NOT treat French apostrophes (l'adresse) as unclosed quotes,
 * and do NOT treat done_reason alone — many models stop with "length"
 * after a complete short answer.
 */
export function looksTruncated(content: string): boolean {
  const text = content.trimEnd();
  if (!text) return false;

  if (hasUnclosedMarkdownFence(text)) return true;
  if (hasIncompleteMainBlock(text)) return true;

  if (text.length < 200 && !endsInsideCodeFence(text)) return false;

  const lastLine = lastNonEmptyLine(text);
  if (!lastLine) return false;

  if (
    /^\s*(def|class|async\s+def|if|elif|else|for|while|try|except|finally|with|match|case)\b.*:\s*$/.test(
      lastLine
    )
  ) {
    return true;
  }

  if (/[(,{=]$/.test(lastLine) || /\\$/.test(lastLine) || /\.\.\.$/.test(lastLine)) {
    return true;
  }

  if (/\b(raise|return|print|throw|await|const|let|var|def|class)\b.*\([^)]*$/.test(lastLine)) {
    return true;
  }

  if (/("""|''')\s*$/.test(lastLine)) return true;

  return false;
}

/**
 * True when a continuation chunk only repeats / apologizes instead of adding new content.
 */
export function isRedundantContinuation(base: string, next: string): boolean {
  const chunk = next.trim();
  if (!chunk) return true;

  const fenced = [...chunk.matchAll(/```[\w]*\n([\s\S]*?)```/g)].map((m) =>
    m[1].trim()
  );
  if (fenced.length > 0) {
    const allAlreadyPresent = fenced.every(
      (code) => code.length >= 40 && base.includes(code)
    );
    if (allAlreadyPresent) return true;
  }

  const sampleLen = Math.min(180, chunk.length);
  const sample = chunk.slice(0, sampleLen);
  if (sampleLen >= 80 && base.includes(sample)) return true;

  const apologizing =
    /je suis d[ée]sol[ée]|voici (donc )?la (réponse complète|continuation)|voici une continuation/i.test(
      chunk
    );
  if (apologizing && fenced.length > 0) {
    const newCode = fenced.some((code) => code.length >= 40 && !base.includes(code));
    if (!newCode) return true;
  }

  return false;
}

/**
 * Continue only when the answer is actually truncated, or when the user
 * asked for a long code dump that is still too short.
 */
export function shouldContinueGeneration(
  content: string,
  doneReason: string | undefined,
  round: number,
  options?: {
    wantsLong?: boolean;
    minCodeLines?: number | null;
  }
): boolean {
  if (looksTruncated(content)) return true;

  const wantsLong = options?.wantsLong ?? false;
  const minLines = options?.minCodeLines ?? null;

  // "length" alone is common after short complete answers — only honor it
  // when the user asked for a long dump that is still undersized.
  if (doneReason === "length" && (wantsLong || minLines != null)) {
    const target = minLines ?? 100;
    const codeLines = countFencedCodeLines(content);
    if (codeLines < target && round < MAX_STREAM_CONTINUATIONS) return true;
  }

  if (!wantsLong && minLines == null) return false;

  const target = minLines ?? 100;
  const codeLines = countFencedCodeLines(content);
  if (codeLines > 0 && codeLines < target && round < MAX_STREAM_CONTINUATIONS) {
    return true;
  }

  return false;
}

export function appendWithoutOverlap(base: string, next: string): string {
  if (!next) return base;
  if (!base) return next;

  const max = Math.min(base.length, next.length, 1200);
  for (let n = max; n >= 8; n--) {
    if (next.startsWith(base.slice(-n))) {
      return base + next.slice(n);
    }
  }
  return base + next;
}

function slimMessagesForContinuation(
  baseMessages: OllamaMessage[]
): OllamaMessage[] {
  const system = baseMessages.filter((m) => m.role === "system");
  const rest = baseMessages.filter((m) => m.role !== "system");
  const lastUser = [...rest].reverse().find((m) => m.role === "user");
  return lastUser ? [...system, lastUser] : [...system, ...rest.slice(-1)];
}

export function buildContinuationMessages(
  baseMessages: OllamaMessage[],
  partialAssistant: string
): OllamaMessage[] {
  const tail =
    partialAssistant.length > CONTINUATION_TAIL_CHARS
      ? partialAssistant.slice(-CONTINUATION_TAIL_CHARS)
      : partialAssistant;

  return [
    ...slimMessagesForContinuation(baseMessages),
    { role: "assistant", content: tail },
    { role: "user", content: CONTINUE_USER_PROMPT },
  ];
}
