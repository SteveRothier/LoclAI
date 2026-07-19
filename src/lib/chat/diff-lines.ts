/**
 * Classify unified-diff lines for chat rendering.
 */

export type DiffLineKind = "add" | "del" | "hunk" | "meta" | "ctx";

export function classifyDiffLine(line: string): DiffLineKind {
  if (/^(\+\+\+|---)/.test(line)) return "meta";
  if (/^@@/.test(line)) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  return "ctx";
}
