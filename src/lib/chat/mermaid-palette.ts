/**
 * ChatGPT-style semantic colors: same role → same color.
 * Roles inferred from Mermaid shape (+ light label heuristics for actors).
 */

export type MermaidNodeRole =
  | "actor"
  | "process"
  | "decision"
  | "database"
  | "system";

export type MermaidSwatch = {
  name: string;
  fill: string;
  stroke: string;
  color: string;
};

/** Dark LoclAI theme, pastel-adjacent borders like ChatGPT role colors. */
export const MERMAID_ROLE_PALETTE: Record<MermaidNodeRole, MermaidSwatch> = {
  actor: {
    name: "mActor",
    fill: "#1e3a5f",
    stroke: "#60a5fa",
    color: "#eff6ff",
  },
  process: {
    name: "mProcess",
    fill: "#3b2a14",
    stroke: "#fb923c",
    color: "#fff7ed",
  },
  decision: {
    name: "mDecision",
    fill: "#3b1528",
    stroke: "#f472b6",
    color: "#fdf2f8",
  },
  database: {
    name: "mDatabase",
    fill: "#16352c",
    stroke: "#34d399",
    color: "#ecfdf5",
  },
  system: {
    name: "mSystem",
    fill: "#1f2937",
    stroke: "#9ca3af",
    color: "#f3f4f6",
  },
};

const RESERVED = new Set([
  "graph",
  "flowchart",
  "subgraph",
  "end",
  "style",
  "classdef",
  "class",
  "click",
  "linkstyle",
  "direction",
  "tb",
  "td",
  "bt",
  "rl",
  "lr",
]);

const ACTOR_LABEL =
  /\b(user|utilisateur|admin|administrateur|acteur|client|agent|personne|human|operator|opérateur)\b/i;

const SYSTEM_LABEL =
  /\b(syst[eè]me|system|service|api|serveur|server|app|application)\b/i;

export type FlowchartNodeInfo = {
  id: string;
  role: MermaidNodeRole;
  label: string;
};

type ShapeKind =
  | "cylinder"
  | "diamond"
  | "circle"
  | "stadium"
  | "rect"
  | "round"
  | "bare";

function roleFromShapeAndLabel(
  shape: ShapeKind,
  label: string
): MermaidNodeRole {
  if (shape === "cylinder") return "database";
  if (shape === "diamond") return "decision";
  if (shape === "circle") return "system";
  if (shape === "stadium") return "actor";
  if (ACTOR_LABEL.test(label) || ACTOR_LABEL.test(label.replace(/_/g, " "))) {
    return "actor";
  }
  if (SYSTEM_LABEL.test(label)) return "system";
  return "process";
}

/**
 * Parse shaped node decls: Id[(x)] Id((x)) Id([x]) Id[x] Id{x} Id(x)
 */
function parseShapedNodes(line: string): FlowchartNodeInfo[] {
  const found: FlowchartNodeInfo[] = [];
  const re =
    /\b([A-Za-z][\w]*)\s*(?:\[\(([^\]\)]*)\)\]|\(\(([^)]*)\)\)|\(\[([^\]]*)\]\)|\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))/g;

  for (const m of line.matchAll(re)) {
    const id = m[1]!;
    if (RESERVED.has(id.toLowerCase())) continue;

    let shape: ShapeKind = "rect";
    let label = "";
    if (m[2] !== undefined) {
      shape = "cylinder";
      label = m[2];
    } else if (m[3] !== undefined) {
      shape = "circle";
      label = m[3];
    } else if (m[4] !== undefined) {
      shape = "stadium";
      label = m[4];
    } else if (m[5] !== undefined) {
      shape = "rect";
      label = m[5];
    } else if (m[6] !== undefined) {
      shape = "diamond";
      label = m[6];
    } else if (m[7] !== undefined) {
      shape = "round";
      label = m[7];
    }

    found.push({
      id,
      label,
      role: roleFromShapeAndLabel(shape, label || id),
    });
  }

  return found;
}

function parseBareEdgeIds(line: string): string[] {
  const withoutLabels = line.replace(/\|[^|]*\|/g, " ");
  const stripped = withoutLabels
    .replace(/\[\([^\]\)]*\)\]/g, " ")
    .replace(/\(\([^)]*\)\)/g, " ")
    .replace(/\(\[[^\]]*\]\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/(--?>|---|-\.-+|==>)/.test(stripped)) return [];

  const parts = stripped.split(/--?>|---|-\.-+|==>/);
  const ids: string[] = [];
  for (const part of [parts[0], parts.at(-1)]) {
    const id = part?.trim().match(/^([A-Za-z][\w]*)$/)?.[1];
    if (id && !RESERVED.has(id.toLowerCase())) ids.push(id);
  }
  return ids;
}

/** Collect nodes with inferred semantic roles (first declaration wins). */
export function extractFlowchartNodes(source: string): FlowchartNodeInfo[] {
  const byId = new Map<string, FlowchartNodeInfo>();

  const upsert = (node: FlowchartNodeInfo, preferShape: boolean) => {
    const prev = byId.get(node.id);
    if (!prev) {
      byId.set(node.id, node);
      return;
    }
    // Prefer an entry that came from an explicit shape over bare id
    if (preferShape && prev.label === "" && node.label !== "") {
      byId.set(node.id, node);
    }
  };

  for (const line of source.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("%%")) continue;
    if (/^(graph|flowchart|style|classDef|class|linkStyle|click)\b/i.test(t)) {
      continue;
    }

    for (const node of parseShapedNodes(t)) {
      upsert(node, true);
    }

    for (const id of parseBareEdgeIds(t)) {
      upsert(
        {
          id,
          label: id,
          role: roleFromShapeAndLabel("bare", id),
        },
        false
      );
    }
  }

  return [...byId.values()];
}

/** @deprecated use extractFlowchartNodes */
export function extractFlowchartNodeIds(source: string): string[] {
  return extractFlowchartNodes(source).map((n) => n.id);
}

/**
 * Append classDef + class by semantic role (flowcharts only).
 */
export function applyMermaidNodePalette(source: string): string {
  const first = source.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
  if (
    !first.startsWith("graph") &&
    !first.startsWith("flowchart")
  ) {
    return source;
  }

  const nodes = extractFlowchartNodes(source);
  if (nodes.length === 0) return source;

  const usedRoles = new Set(nodes.map((n) => n.role));
  const defs = [...usedRoles]
    .map((role) => {
      const p = MERMAID_ROLE_PALETTE[role];
      return `classDef ${p.name} fill:${p.fill},stroke:${p.stroke},color:${p.color},stroke-width:1.75px`;
    })
    .join("\n");

  const byClass = new Map<string, string[]>();
  for (const node of nodes) {
    const className = MERMAID_ROLE_PALETTE[node.role].name;
    const list = byClass.get(className) ?? [];
    list.push(node.id);
    byClass.set(className, list);
  }

  const assignments = [...byClass.entries()]
    .map(([className, ids]) => `class ${ids.join(",")} ${className}`)
    .join("\n");

  return `${source.trim()}\n${defs}\n${assignments}`;
}
