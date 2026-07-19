/**
 * Repair frequent LLM Mermaid mistakes so official mermaid.js can render.
 * Flowchart gets heavy repair; beta/archi/sankey get targeted fixes.
 */

import {
  firstMermaidContentLine,
  mermaidLeadingKeyword,
} from "@/lib/chat/mermaid-diagram-kinds";

export type MermaidDiagramKind =
  | "flowchart"
  | "sequence"
  | "gantt"
  | "c4"
  | "kanban"
  | "chart"
  | "architecture"
  | "block"
  | "other";

export function normalizeMermaidSource(raw: string): string {
  const text = raw.trim();
  if (!text) return text;

  // LLM invents "architecture participants A[x] B[y]" + flowchart edges
  if (isFakeArchitectureFlowchart(text)) {
    return normalizeFlowchart(fakeArchitectureToFlowchart(text));
  }

  const kind = detectDiagramKind(text.split("\n"));

  if (kind === "flowchart") {
    return normalizeFlowchart(text);
  }

  if (kind === "architecture") {
    return normalizeArchitecture(text);
  }

  if (kind === "block") {
    return normalizeBlock(text);
  }

  if (kind === "c4") {
    return normalizeC4(text);
  }

  if (kind === "chart") {
    const kw = mermaidLeadingKeyword(firstMermaidContentLine(text));
    if (kw.startsWith("sankey")) return normalizeSankey(text);
    if (kw.startsWith("radar")) return normalizeRadar(text);
    if (
      kw.startsWith("packet") ||
      kw.startsWith("treemap") ||
      kw.startsWith("xychart")
    ) {
      return stripUnsupportedTitle(text);
    }
  }

  return text;
}

function stripUnsupportedTitle(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*title\b/i.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Keep only the first diagram when the LLM pastes the same header twice
 * (e.g. two `block-beta` blocks concatenated → Mermaid expects `end`).
 */
function keepFirstDiagram(text: string, headerRe: RegExp): string {
  const lines = text.split("\n");
  let first = -1;
  let second = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!headerRe.test(lines[i]!.trim())) continue;
    if (first < 0) first = i;
    else {
      second = i;
      break;
    }
  }
  if (first >= 0 && second > first) {
    return lines.slice(first, second).join("\n").trim();
  }
  return text.trim();
}

/** Labels with `.` `/` `-` etc. must be quoted: [Next.js] → ["Next.js"]. */
function quoteArchitectureLabels(text: string): string {
  return text.replace(
    /\b(group|service|junction)\s+(\w+)\(([^)]+)\)\[([^\]]*)\]/gi,
    (_m, kind: string, id: string, icon: string, label: string) => {
      const trimmed = label.trim();
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return `${kind} ${id}(${icon})[${trimmed}]`;
      }
      // Alphanumeric + spaces only — leave bare
      if (/^[A-Za-z0-9 ]*$/.test(trimmed)) {
        return `${kind} ${id}(${icon})[${trimmed}]`;
      }
      const escaped = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `${kind} ${id}(${icon})["${escaped}"]`;
    }
  );
}

function normalizeArchitecture(text: string): string {
  let out = stripUnsupportedTitle(text);
  out = keepFirstDiagram(out, /^architecture(-beta)?\b/i);
  // LLM often writes `A:R -> L:B` ; Mermaid wants `-->`
  out = out.replace(/:([TBLR])\s*->\s*([TBLR]):/gi, ":$1 --> $2:");
  out = quoteArchitectureLabels(out);
  // Ensure beta header
  out = out.replace(/^architecture(?!-beta)\b/i, "architecture-beta");
  return out.trim();
}

/** Bare `C4 title …` / `C4` → `C4Context` (+ title line). */
export function normalizeC4(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let sawHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }

    // `C4 title Foo` or `C4Context title Foo` on one line
    const inlineTitle =
      /^(C4(?:Context|Container|Component|Dynamic|Deployment)?)\s+title\s+(.+)$/i.exec(
        trimmed
      );
    if (inlineTitle) {
      const kind = inlineTitle[1]!;
      const title = inlineTitle[2]!.trim();
      out.push(normalizeC4Header(kind));
      out.push(`  title ${title}`);
      sawHeader = true;
      continue;
    }

    if (/^C4$/i.test(trimmed)) {
      out.push("C4Context");
      sawHeader = true;
      continue;
    }

    if (/^C4(Context|Container|Component|Dynamic|Deployment)\b/i.test(trimmed)) {
      out.push(normalizeC4Header(trimmed.split(/\s+/)[0]!));
      sawHeader = true;
      continue;
    }

    out.push(line);
  }

  if (!sawHeader) {
    return `C4Context\n${text}`.trim();
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeC4Header(token: string): string {
  const map: Record<string, string> = {
    c4: "C4Context",
    c4context: "C4Context",
    c4container: "C4Container",
    c4component: "C4Component",
    c4dynamic: "C4Dynamic",
    c4deployment: "C4Deployment",
  };
  return map[token.trim().toLowerCase()] ?? "C4Context";
}

/** `radar title X` / bare `radar` → `radar-beta` (+ title). */
export function normalizeRadar(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let sawHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }

    const inlineTitle = /^radar(?:-beta)?\s+title\s+(.+)$/i.exec(trimmed);
    if (inlineTitle) {
      out.push("radar-beta");
      out.push(`  title ${inlineTitle[1]!.trim()}`);
      sawHeader = true;
      continue;
    }

    if (/^radar(?:-beta)?\b/i.test(trimmed)) {
      out.push("radar-beta");
      sawHeader = true;
      continue;
    }

    // LLM sometimes writes curve id["L"]: [1,2] or id: 0.1,0.2 — force {…}
    const curveColon =
      /^(curve\s+\w+(?:\[[^\]]*\])?)\s*:\s*\[?([^\]\n]+)\]?\s*$/i.exec(
        trimmed
      );
    if (curveColon) {
      out.push(`  ${curveColon[1]}{${curveColon[2]!.trim()}}`);
      continue;
    }

    out.push(line);
  }

  if (!sawHeader) {
    return `radar-beta\n${text}`.trim();
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Detect LLM fake: `architecture participants A[x] B[y]` + flowchart edges.
 * Real architecture-beta uses group/service/junction.
 */
export function isFakeArchitectureFlowchart(text: string): boolean {
  const first = firstMermaidContentLine(text);
  if (!/^architecture\b/i.test(first)) return false;
  if (/^architecture-beta\b/i.test(first)) return false;
  if (/\b(group|service|junction)\b/i.test(text)) return false;
  if (/\bparticipants?\b/i.test(first) || /\bparticipants?\b/i.test(text)) {
    return true;
  }
  // architecture + flowchart edges, no architecture verbs
  return /(--?>|---|-\.-+|==>)/.test(text);
}

export function fakeArchitectureToFlowchart(text: string): string {
  const lines = text.split("\n");
  const out: string[] = ["flowchart LR"];
  const declared = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Header: architecture participants A[API] B[Front-end]
    const header =
      /^architecture(?:-beta)?\s+participants?\s+(.+)$/i.exec(trimmed);
    if (header) {
      const nodeRe =
        /\b([A-Za-z][\w]*)\s*(?:\[\(([^\]\)]*)\)\]|\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})?/g;
      let m: RegExpExecArray | null;
      while ((m = nodeRe.exec(header[1]!)) !== null) {
        const id = m[1]!;
        if (/^(architecture|participants?)$/i.test(id)) continue;
        const label = m[2] ?? m[3] ?? m[4] ?? m[5] ?? id;
        if (!declared.has(id)) {
          declared.add(id);
          out.push(`  ${id}[${label}]`);
        }
      }
      continue;
    }

    if (/^architecture(?:-beta)?\b/i.test(trimmed)) continue;

    if (isLikelyFlowchartStatement(trimmed)) {
      out.push(`  ${repairFlowchartLine(trimmed)}`);
    }
  }

  return out.join("\n").trim();
}

function normalizeBlock(text: string): string {
  let out = stripUnsupportedTitle(text);
  out = keepFirstDiagram(out, /^block(-beta)?\b/i);
  return out.trim();
}

/**
 * Mermaid `block-beta` often throws in React/Next ("circular structure to JSON").
 * Convert simple column layouts to a stable flowchart for SVG render.
 */
export function convertBlockBetaToFlowchart(raw: string): string | null {
  const text = normalizeBlock(raw);
  if (!/^block(-beta)?\b/i.test(firstMermaidContentLine(text))) return null;

  let columns = 0;
  const rows: string[][] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      rows.push(current);
      current = [];
    }
  };

  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || /^%%/.test(t)) continue;
    if (/^block(-beta)?\b/i.test(t)) continue;
    if (/^columns\s+(\d+)\b/i.test(t)) {
      columns = Number(/^columns\s+(\d+)\b/i.exec(t)?.[1] ?? 0);
      continue;
    }
    // Nested composite blocks — too complex; bail to caller
    if (/^block\s*:/i.test(t) || /^end\b/i.test(t)) return null;

    if (/^space(?::\d+)?\b/i.test(t)) {
      flush();
      rows.push([]); // visual gap between rows
      continue;
    }

    // Tokens: id["Label"] | id[Label] | bareWord | id:width
    const tokenRe =
      /([A-Za-z][\w]*)(?:\["([^"]*)"\]|\['([^']*)'\]|\[([^\]]*)\]|(?::\d+)?)?/g;
    let m: RegExpExecArray | null;
    const lineTokens: { id: string; label: string }[] = [];
    while ((m = tokenRe.exec(t)) !== null) {
      const id = m[1]!;
      if (/^(columns|space|block|end)$/i.test(id)) continue;
      const label = m[2] ?? m[3] ?? m[4] ?? id;
      lineTokens.push({ id, label });
    }

    for (const tok of lineTokens) {
      current.push(tok.label);
      if (columns > 0 && current.length >= columns) flush();
    }
  }
  flush();

  const nonEmpty = rows.filter((r) => r.length > 0);
  if (nonEmpty.length === 0) return null;

  const lines: string[] = ["flowchart TB"];
  let n = 0;
  const rowIds: string[] = [];

  nonEmpty.forEach((row, ri) => {
    const sid = `row${ri}`;
    rowIds.push(sid);
    lines.push(`  subgraph ${sid}[" "]`);
    lines.push(`    direction LR`);
    for (const label of row) {
      const id = `b${n++}`;
      const safe = label.replace(/"/g, "#quot;");
      lines.push(`    ${id}["${safe}"]`);
    }
    lines.push(`  end`);
  });

  for (let i = 0; i < rowIds.length - 1; i++) {
    lines.push(`  ${rowIds[i]} --> ${rowIds[i + 1]}`);
  }

  return lines.join("\n");
}

/**
 * Sankey is CSV: source,target,value — LLMs invent flowchart edges instead.
 */
export function normalizeSankey(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    if (/^%%/.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    if (/^sankey(-beta)?\b/i.test(trimmed)) {
      out.push("sankey-beta");
      continue;
    }
    if (/^title\b/i.test(trimmed)) continue;

    // Already CSV: Source,Target,Value
    if (/^[^,]+,[^,]+,\s*[\d.]+%?\s*$/.test(trimmed)) {
      const parts = trimmed.split(",").map((s) => s.trim());
      const value = (parts[2] ?? "").replace(/%$/, "");
      out.push(
        `${stripNodeDecor(parts[0]!)},${stripNodeDecor(parts[1]!)},${value}`
      );
      continue;
    }

    // LLM: "Users,Chat" : 50  /  Users,Chat : 50
    const colonPair =
      /^["']([^"']+)["']\s*:\s*([\d.]+)%?\s*$/.exec(trimmed) ??
      /^([^:"'\n]+?)\s*:\s*([\d.]+)%?\s*$/.exec(trimmed);
    if (colonPair) {
      const ends = colonPair[1]!
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      if (ends.length >= 2) {
        out.push(`${ends[0]},${ends[1]},${colonPair[2]}`);
        continue;
      }
    }

    // LLM: "Users" -> "Chat" : 50
    const arrowColon =
      /^["']?([^"',]+?)["']?\s*--?>\s*["']?([^"',]+?)["']?\s*:\s*([\d.]+)%?\s*$/.exec(
        trimmed
      );
    if (arrowColon) {
      out.push(
        `${arrowColon[1]!.trim()},${arrowColon[2]!.trim()},${arrowColon[3]}`
      );
      continue;
    }

    // Flowchart-like: A[Label] -->|40%|> B[Label]
    const pipeEdge =
      /^(.+?)\s*-->\|([^|]*)\|>\s*(.+?)\s*$/.exec(trimmed) ??
      /^(.+?)\s*--?>\|([^|]*)\|\s*(.+?)\s*$/.exec(trimmed);

    if (pipeEdge) {
      const left = stripNodeDecor(pipeEdge[1]!);
      const right = stripNodeDecor(pipeEdge[3]!);
      const num = (pipeEdge[2] ?? "").match(/[\d.]+/)?.[0] ?? "1";
      if (left && right) {
        out.push(`${left},${right},${num}`);
        continue;
      }
    }

    // A --> B with optional numeric label elsewhere
    const plainEdge = /^(.+?)\s*--?>\s*(.+?)\s*$/.exec(trimmed);
    if (plainEdge && !trimmed.includes(",")) {
      const left = stripNodeDecor(plainEdge[1]!);
      const right = stripNodeDecor(plainEdge[2]!);
      if (left && right && left !== "sankey-beta") {
        out.push(`${left},${right},1`);
        continue;
      }
    }

    // Quoted CSV row: "Users","Chat",50
    const quotedCsv =
      /^["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([\d.]+)%?\s*$/.exec(
        trimmed
      );
    if (quotedCsv) {
      out.push(`${quotedCsv[1]},${quotedCsv[2]},${quotedCsv[3]}`);
      continue;
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripNodeDecor(raw: string): string {
  let t = raw.trim();
  // Id[Label] / Id(Label) / Id{Label}
  const shaped = /^([A-Za-z][\w]*)\s*(?:\[.*\]|\(.*\)|\{.*\})\s*$/.exec(t);
  if (shaped) return shaped[1]!;
  t = t.replace(/^["']|["']$/g, "");
  return t.replace(/,/g, " ");
}

function normalizeFlowchart(text: string): string {
  let next = text
    .replace(/\u2192/g, "-->")
    .replace(/\u2794/g, "-->")
    .replace(/([^\-\s])\s*->\s*/g, "$1-->")
    .replace(/\(([A-Za-z][\w]*)\s*:\s*([^)]+)\)/g, "$1[$2]")
    .replace(/(--?>\|[^|]+\|)\s*>/g, "$1 ")
    .replace(/\{\s*~?\s*>\s*\}/g, "")
    .replace(/\{[^}\n]+\}(?=[A-Za-z_])/g, "");

  const repairedLines = next.split("\n");
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

  next = out.join("\n");

  next = next
    .replace(/\[([^\]"]*'[^\]"]*)\]/g, '["$1"]')
    .replace(/\{([^}"]*'[^}"]*)\}/g, '{"$1"}')
    .replace(/\|([^|"'\n]*'[^|\n]*)\|/g, '|"$1"|');

  return next.replace(/\n{3,}/g, "\n\n").trim();
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
 * Normalize, then salvage when possible.
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
    return {
      source: normalized,
      repaired: normalized.trim() !== raw.trim(),
    };
  }

  const kind = detectDiagramKind(normalized.split("\n"));

  // block-beta: native parse can fail in some hosts — flowchart fallback
  if (kind === "block") {
    const asFlow = convertBlockBetaToFlowchart(normalized);
    if (asFlow && (await tryParse(asFlow))) {
      return { source: asFlow, repaired: true };
    }
  }

  // Second pass: strip title + retry for architecture/block
  if (kind === "architecture" || kind === "block") {
    const stripped = stripUnsupportedTitle(normalized);
    if (stripped !== normalized && (await tryParse(stripped))) {
      return { source: stripped, repaired: true };
    }
  }

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
  const first = firstMermaidContentLine(lines.join("\n"));
  const keyword = mermaidLeadingKeyword(first);
  if (!keyword) return "other";

  if (
    keyword === "graph" ||
    keyword === "flowchart" ||
    keyword.startsWith("flowchart")
  ) {
    return "flowchart";
  }
  if (keyword === "sequencediagram" || keyword === "zenuml") return "sequence";
  if (keyword === "gantt") return "gantt";
  if (keyword.startsWith("c4")) return "c4";
  if (keyword === "kanban") return "kanban";
  if (keyword.startsWith("architecture")) return "architecture";
  if (keyword === "block" || keyword.startsWith("block-")) return "block";
  if (
    keyword === "pie" ||
    keyword.startsWith("quadrant") ||
    keyword.startsWith("sankey") ||
    keyword.startsWith("xychart") ||
    keyword.startsWith("radar") ||
    keyword.startsWith("treemap")
  ) {
    return "chart";
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

  if (/^[A-Za-z][\w]*[[({><%/\\]/.test(t)) {
    return t.replace(/\{\s*~?\s*>\s*\}/g, "");
  }
  if (/^[A-Za-z][\w]*$/.test(t)) return t;

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
