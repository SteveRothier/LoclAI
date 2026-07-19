/**
 * GitHub-style alert markers: > [!NOTE] / [!TIP] / …
 */

export const CALLOUT_KINDS = [
  "note",
  "tip",
  "warning",
  "important",
  "caution",
  "danger",
  "error",
  "success",
  "info",
  "question",
  "bug",
  "example",
] as const;

export type CalloutKind = (typeof CALLOUT_KINDS)[number];

/** Normalize aliases to canonical kinds. */
const KIND_ALIASES: Record<string, CalloutKind> = {
  note: "note",
  tip: "tip",
  warning: "warning",
  important: "important",
  caution: "caution",
  danger: "danger",
  error: "error",
  failure: "error",
  success: "success",
  info: "info",
  question: "question",
  bug: "bug",
  example: "example",
  abstract: "note",
  quote: "note",
};

const MARKER_RE =
  /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|DANGER|ERROR|FAILURE|SUCCESS|INFO|QUESTION|BUG|EXAMPLE|ABSTRACT|QUOTE)\][ \t]*(?:\r?\n)?/i;

export function parseCalloutMarker(
  text: string
): { kind: CalloutKind; rest: string } | null {
  const normalized = text.replace(/^\uFEFF/, "").trimStart();
  const m = MARKER_RE.exec(normalized);
  if (!m) return null;
  const raw = m[1]!.toLowerCase();
  const kind = KIND_ALIASES[raw];
  if (!kind) return null;
  return { kind, rest: normalized.slice(m[0].length).trimStart() };
}

export const CALLOUT_LABELS: Record<CalloutKind, string> = {
  note: "Note",
  tip: "Astuce",
  warning: "Attention",
  important: "Important",
  caution: "Prudence",
  danger: "Danger",
  error: "Erreur",
  success: "Succès",
  info: "Info",
  question: "Question",
  bug: "Bug",
  example: "Exemple",
};
