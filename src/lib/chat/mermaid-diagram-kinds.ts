/**
 * Central Mermaid diagram-kind detection for chat fences.
 * Covers ChatGPT-listed types + Mermaid 11 extras (beta / C4 / kanban / …).
 */

/** First-token keywords (case-insensitive) that start a Mermaid diagram. */
export const MERMAID_DIAGRAM_KEYWORDS = [
  // Flow
  "graph",
  "flowchart",
  // UML / data
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "requirementdiagram",
  // Planning / UX
  "gantt",
  "journey",
  "timeline",
  "kanban",
  "gitgraph",
  // Charts
  "pie",
  "quadrantchart",
  "sankey",
  "sankey-beta",
  "xychart",
  "xychart-beta",
  "radar",
  "radar-beta",
  "treemap",
  "treemap-beta",
  // Architecture / packets / blocks
  "block",
  "block-beta",
  "packet",
  "packet-beta",
  "architecture",
  "architecture-beta",
  // C4
  "c4context",
  "c4container",
  "c4component",
  "c4dynamic",
  "c4deployment",
  // Other
  "mindmap",
  "zenuml",
] as const;

const KEYWORD_SET = new Set<string>(MERMAID_DIAGRAM_KEYWORDS);

const FENCE_LANGUAGES = new Set(["mermaid", "mmd"]);

/** First non-empty, non-%%-comment line of a diagram source. */
export function firstMermaidContentLine(code: string): string {
  const lines = code.split("\n");
  let i = 0;
  // Skip leading blank / %% lines
  while (i < lines.length) {
    const t = lines[i]!.trim();
    if (!t || t.startsWith("%%")) {
      i += 1;
      continue;
    }
    break;
  }
  // Skip YAML front-matter --- ... ---
  if (i < lines.length && lines[i]!.trim() === "---") {
    i += 1;
    while (i < lines.length && lines[i]!.trim() !== "---") i += 1;
    if (i < lines.length) i += 1;
  }
  while (i < lines.length) {
    const t = lines[i]!.trim();
    i += 1;
    if (!t || t.startsWith("%%")) continue;
    return t;
  }
  return "";
}

/** Leading keyword token from a content line (strips trailing junk). */
export function mermaidLeadingKeyword(line: string): string {
  const m = /^([A-Za-z][\w-]*)/.exec(line.trim());
  return (m?.[1] ?? "").toLowerCase();
}

export function isMermaidFenceLanguage(language: string): boolean {
  return FENCE_LANGUAGES.has(language.trim().toLowerCase());
}

/**
 * True if source looks like a Mermaid diagram (keyword on first content line).
 */
export function isMermaidDiagramSource(code: string): boolean {
  const first = firstMermaidContentLine(code);
  if (!first) return false;
  const keyword = mermaidLeadingKeyword(first);
  if (!keyword) return false;

  if (KEYWORD_SET.has(keyword)) return true;

  // stateDiagram-v2 already in set; also accept stateDiagram with suffix variants
  if (keyword.startsWith("statediagram")) return true;
  if (keyword.startsWith("c4")) return true;

  return false;
}

/** Fence language is mermaid/mmd with diagram body, or body starts with a known keyword. */
export function isMermaidSegment(language: string, code: string): boolean {
  if (isMermaidDiagramSource(code)) return true;
  if (isMermaidFenceLanguage(language)) {
    // Empty / still streaming — keep Mermaid host so the fence doesn't flash as hljs
    return code.trim().length === 0;
  }
  return false;
}

/**
 * LLM sometimes wraps Markdown (tables, headings) in a ```mermaid fence.
 * Those should render as Markdown, not Mermaid error source.
 */
export function isMarkdownMistakenForMermaid(
  language: string,
  code: string
): boolean {
  if (!isMermaidFenceLanguage(language)) return false;
  if (isMermaidDiagramSource(code)) return false;
  const t = code.trim();
  if (!t) return false;
  if (/^#{1,6}\s/m.test(t)) return true;
  if (/^\|.+\|/m.test(t) && /\|?\s*:?-+:?\s*\|/.test(t)) return true;
  if (/^[-*+]\s+\[[ xX]\]/m.test(t)) return true;
  if (/^[-*+]\s+\S/m.test(t) && !/-->/.test(t)) return true;
  return false;
}
