/**
 * Repair frequent LLM Mermaid mistakes so official mermaid.js can render.
 * Flowchart-only repairs — gantt / sequence / pie / etc. are left intact.
 */

export type MermaidDiagramKind =
  | "flowchart"
  | "sequence"
  | "gantt"
  | "other";

export function normalizeMermaidSource(raw: string): string {
  let text = raw.trim();
  if (!text) return text;

  const lines = text.split("\n");
  const kind = detectDiagramKind(lines);

  // Never rewrite non-flowchart diagrams (gantt, sequence, pie, …).
  if (kind !== "flowchart") {
    return text;
  }

  text = text
    .replace(/\u2192/g, "-->")
    .replace(/\u2794/g, "-->")
    .replace(/([^\-\s])\s*->\s*/g, "$1-->")
    .replace(/\(([A-Za-z][\w]*)\s*:\s*([^)]+)\)/g, "$1[$2]")
    .replace(/(--?>\|[^|]+\|)\s*>/g, "$1 ")
    .replace(/\{\s*~?\s*>\s*\}/g, "")
    .replace(/\{[^}\n]+\}(?=[A-Za-z_])/g, "");

  const repairedLines = text.split("\n");
  const out: string[] = [];

  for (const line of repairedLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^end\s+note\b/i.test(trimmed)) continue;
    if (/^note\s+(right|left)\s+of\b/i.test(trimmed)) continue;
    if (/^note\s+style\b/i.test(trimmed)) continue;
    if (/^note\s+over\b/i.test(trimmed)) continue;
    if (/^class\b/i.test(trimmed) && /[>]/.test(trimmed)) continue;

    const headerEdge =
      /^(graph|flowchart)\s+(\w+)\s+(.+)$/i.exec(trimmed);
    if (
      headerEdge &&
      /(--?>|---|-\.-+|==>)/.test(headerEdge[3]!)
    ) {
      out.push(`${headerEdge[1]} ${headerEdge[2]}`);
      out.push(repairFlowchartLine(headerEdge[3]!));
      continue;
    }

    if (/^(graph|flowchart)\b/i.test(trimmed)) {
      out.push(trimmed.replace(/;?\s*$/, ""));
      continue;
    }

    if (/^(style|classDef|class|linkStyle|click)\b/i.test(trimmed)) {
      continue;
    }

    if (!isLikelyFlowchartStatement(trimmed)) continue;

    out.push(repairFlowchartLine(line));
  }

  text = out.join("\n");

  text = text
    .replace(/\[([^\]"]*'[^\]"]*)\]/g, '["$1"]')
    .replace(/\{([^}"]*'[^}"]*)\}/g, '{"$1"}')
    .replace(/\|([^|"'\n]*'[^|\n]*)\|/g, '|"$1"|');

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** True for lines that look like flowchart statements (not French prose). */
export function isLikelyFlowchartStatement(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^(graph|flowchart|style|classDef|class|linkStyle|click|%%)/i.test(t)) {
    return true;
  }
  if (/(--?>|---|-\.-+|==>)/.test(t)) return true;
  if (/^[A-Za-z][\w]*\s*(?:\[\[|\[\(|\[|\(|\{)/.test(t)) return true;
  return false;
}

/**
 * Normalize, then (flowcharts only) drop lines until mermaid.parse succeeds.
 */
export async function coerceMermaidSource(
  raw: string,
  parse: (text: string) => Promise<unknown>
): Promise<{ source: string; repaired: boolean } | null> {
  const normalized = normalizeMermaidSource(raw);

  const tryParse = async (s: string) => {
    try {
      await parse(s);
      return true;
    } catch {
      return false;
    }
  };

  if (await tryParse(normalized)) {
    return { source: normalized, repaired: false };
  }

  const kind = detectDiagramKind(normalized.split("\n"));
  // Don't invent a flowchart salvage for gantt/sequence/etc.
  if (kind !== "flowchart") {
    return null;
  }

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let header =
    lines.find((l) => /^(graph|flowchart)\b/i.test(l)) ?? "flowchart TD";
  header = header.replace(/;?\s*$/, "");

  const candidates = lines.filter(
    (l) =>
      l !== header &&
      !/^(graph|flowchart)\b/i.test(l) &&
      isLikelyFlowchartStatement(l)
  );

  let built = header;
  let added = 0;
  for (const line of candidates) {
    const next = `${built}\n${line}`;
    if (await tryParse(next)) {
      built = next;
      added += 1;
    }
  }

  if (added > 0 && (await tryParse(built))) {
    return { source: built, repaired: true };
  }

  return null;
}

export function detectDiagramKind(lines: string[]): MermaidDiagramKind {
  for (const line of lines) {
    const t = line.trim().toLowerCase();
    if (!t || t.startsWith("%%") || t.startsWith("---")) continue;
    if (
      t.startsWith("graph ") ||
      t.startsWith("flowchart ") ||
      t === "graph" ||
      t === "flowchart" ||
      t.startsWith("graph;") ||
      /^graph\s+\w+;?$/.test(t)
    ) {
      return "flowchart";
    }
    if (t.startsWith("sequencediagram")) return "sequence";
    if (t === "gantt" || t.startsWith("gantt ")) return "gantt";
    break;
  }
  return "other";
}

function repairFlowchartLine(line: string): string {
  const edge =
    /^(\s*)(.+?)(--?>|---|-\.-+|==>)(\|[^|]*\|)?\s*(.+?)\s*;?\s*$/.exec(line);
  if (!edge) return line;

  const indent = edge[1] ?? "";
  const left = normalizeEndpoint(edge[2]!.trim());
  const arrow = edge[3]!;
  const label = quoteEdgeLabel(edge[4] ?? "");
  const right = normalizeEndpoint(edge[5]!.trim().replace(/;$/, ""));

  return `${indent}${left} ${arrow}${label} ${right}`;
}

function quoteEdgeLabel(label: string): string {
  if (!label) return label;
  const inner = label.slice(1, -1);
  if (!inner) return label;
  if (
    (inner.startsWith('"') && inner.endsWith('"')) ||
    (inner.startsWith("'") && inner.endsWith("'"))
  ) {
    return label;
  }
  if (/['"]/.test(inner)) {
    return `|"${inner.replace(/"/g, "'")}"|`;
  }
  return label;
}

function slugId(label: string): string {
  return (
    "n_" +
      label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40) || "node"
  );
}

function normalizeEndpoint(raw: string): string {
  const t = raw
    .trim()
    .replace(/\{\s*~?\s*>\s*\}/g, "")
    .replace(/[~>]+\s*$/g, "")
    .trim();
  if (!t) return "node";

  // Already has id + shape
  if (/^[A-Za-z][\w]*[[({><%/\\]/.test(t)) {
    return t.replace(/\{\s*~?\s*>\s*\}/g, "");
  }
  if (/^[A-Za-z][\w]*$/.test(t)) return t;

  // Shape without id — do NOT wrap again in [...]
  const cyl = /^\[\((.+)\)\]$/.exec(t);
  if (cyl) return `${slugId(cyl[1]!)}[(${cyl[1]})]`;

  const dblDecision = /^\[\[\{(.+)\}\]\]$/.exec(t);
  if (dblDecision) return `${slugId(dblDecision[1]!)}{${dblDecision[1]}}`;

  const brDecision = /^\[\{(.+)\}\]$/.exec(t);
  if (brDecision) return `${slugId(brDecision[1]!)}{${brDecision[1]}}`;

  const diamond = /^\{(.+)\}$/.exec(t);
  if (diamond) return `${slugId(diamond[1]!)}{${diamond[1]}}`;

  const rect = /^\[(.+)\]$/.exec(t);
  if (rect) {
    const label = rect[1]!;
    const id = slugId(label);
    return /['"]/.test(label)
      ? `${id}["${label.replace(/"/g, "'")}"]`
      : `${id}[${label}]`;
  }

  const round = /^\((.+)\)$/.exec(t);
  if (round) return `${slugId(round[1]!)}(${round[1]})`;

  const label = t.replace(/^["']|["']$/g, "");
  const id = slugId(label);
  return /['"]/.test(label)
    ? `${id}["${label.replace(/"/g, "'")}"]`
    : `${id}[${label}]`;
}
