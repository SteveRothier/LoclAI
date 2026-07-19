/**
 * Registry of custom Markdown fences for LoclAI chat blocks.
 * Aliases resolve to a canonical kind before render.
 */

export const MD_BLOCK_KINDS = [
  "details",
  "spoiler",
  "steps",
  "tabs",
  "cards",
  "badges",
  "terminal",
  "file-tree",
  "prompt",
  "progress",
  "toc",
  "dl",
] as const;

export type MdBlockKind = (typeof MD_BLOCK_KINDS)[number];

const ALIASES: Record<string, MdBlockKind> = {
  details: "details",
  accordion: "details",
  expand: "details",
  spoiler: "spoiler",
  steps: "steps",
  tutorial: "steps",
  tabs: "tabs",
  cards: "cards",
  badges: "badges",
  badge: "badges",
  terminal: "terminal",
  console: "terminal",
  shell: "terminal",
  "file-tree": "file-tree",
  tree: "file-tree",
  directory: "file-tree",
  prompt: "prompt",
  progress: "progress",
  toc: "toc",
  dl: "dl",
  definitions: "dl",
  "definition-list": "dl",
};

export function resolveMdBlockKind(language: string): MdBlockKind | null {
  const key = language.trim().toLowerCase();
  return ALIASES[key] ?? null;
}

export function isCustomMdBlock(language: string): boolean {
  return resolveMdBlockKind(language) !== null;
}

/**
 * Resolve custom block from fence language and/or first body line.
 * Recovers when LLMs wrap blocks in ```mermaid / ```text with a leading keyword.
 */
export function resolveMdBlockFence(
  language: string,
  code: string
): { kind: MdBlockKind; code: string } | null {
  const normalized = code.replace(/\r\n/g, "\n").trim();
  const lines = normalized.length > 0 ? normalized.split("\n") : [];
  const firstLine = lines[0]?.trim() ?? "";
  const firstWord = /^([\w-]+)/.exec(firstLine)?.[1]?.toLowerCase() ?? "";

  const langKind = resolveMdBlockKind(language);
  const bodyKind = resolveMdBlockKind(firstWord);
  const kind = langKind ?? bodyKind;
  if (!kind) return null;

  const leadingIsKind =
    bodyKind === kind &&
    (firstLine.toLowerCase() === firstWord ||
      resolveMdBlockKind(firstLine) === kind);

  if (leadingIsKind) {
    return { kind, code: lines.slice(1).join("\n").trim() };
  }
  return { kind, code: normalized };
}

export function isCustomMdBlockFence(language: string, code: string): boolean {
  return resolveMdBlockFence(language, code) !== null;
}

export type MdSection = { title: string; body: string };

/** Split on `## Title` headings (ATX). */
export function parseHashSections(code: string): MdSection[] {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const sections: MdSection[] = [];
  let title = "";
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (title || body) sections.push({ title: title || "Section", body });
    title = "";
    buf = [];
  };

  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      if (title || buf.some((l) => l.trim())) flush();
      title = m[1]!.trim();
      continue;
    }
    buf.push(line);
  }
  if (title || buf.some((l) => l.trim())) flush();
  return sections;
}

export function parseDetails(code: string): { summary: string; body: string } {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const first = lines[0]?.trim() ?? "Détails";
  const body = lines.slice(1).join("\n").trim();
  return { summary: first || "Détails", body };
}

export function parseSteps(code: string): string[] {
  const out: string[] = [];
  for (const line of code.replace(/\r\n/g, "\n").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const m = /^(?:\d+[.)]\s+|[-*+]\s+)(.+)$/.exec(t);
    out.push(m ? m[1]!.trim() : t);
  }
  return out;
}

export type BadgeItem = { label: string; tone: string };

export function parseBadges(code: string): BadgeItem[] {
  return code
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, tone] = line.split("|").map((s) => s.trim());
      return { label: label || line, tone: (tone || "default").toLowerCase() };
    });
}

export type ProgressItem = { label: string; value: number };

export function parseProgress(code: string): ProgressItem[] {
  return code
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.split("|").map((s) => s.trim());
      if (pipe.length >= 2) {
        const value = Number(pipe[1]!.replace(/%$/, ""));
        return {
          label: pipe[0]!,
          value: Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0,
        };
      }
      const only = Number(line.replace(/%$/, ""));
      return {
        label: "",
        value: Number.isFinite(only) ? Math.min(100, Math.max(0, only)) : 0,
      };
    });
}

export type FileTreeNode = { name: string; depth: number };

export function parseFileTree(code: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  for (const raw of code.replace(/\r\n/g, "\n").split("\n")) {
    if (!raw.trim()) continue;
    const expanded = raw
      .replace(/\t/g, "  ")
      .replace(/[│|]/g, " ")
      .replace(/├─+|└─+|──+/g, "  ");
    const m = /^( *)(.*)$/.exec(expanded);
    if (!m) continue;
    const depth = Math.floor((m[1]?.length ?? 0) / 2);
    const name = (m[2] ?? "").trim();
    if (!name) continue;
    nodes.push({ name, depth });
  }
  return nodes;
}

export type DlItem = { term: string; def: string };

export function parseDefinitionList(code: string): DlItem[] {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const items: DlItem[] = [];
  let term = "";
  let defBuf: string[] = [];

  const flush = () => {
    if (!term) return;
    items.push({ term, def: defBuf.join("\n").trim() });
    term = "";
    defBuf = [];
  };

  for (const line of lines) {
    if (/^:\s+/.test(line) || line.startsWith(":")) {
      defBuf.push(line.replace(/^:\s?/, ""));
      continue;
    }
    if (line.trim() === "") {
      if (term) flush();
      continue;
    }
    if (term) flush();
    term = line.trim();
  }
  if (term) flush();
  return items;
}

export function extractTocEntries(code: string): { text: string; slug: string }[] {
  const entries: { text: string; slug: string }[] = [];
  for (const line of code.replace(/\r\n/g, "\n").split("\n")) {
    const h = /^(#{2,6})\s+(.+)$/.exec(line.trim());
    if (h) {
      const text = h[2]!.trim();
      entries.push({ text, slug: slugify(text) });
      continue;
    }
    const li = /^[-*+]\s+\[([^\]]+)\](?:\(([^)]+)\))?/.exec(line.trim());
    if (li) {
      entries.push({
        text: li[1]!,
        slug: li[2]?.replace(/^#/, "") || slugify(li[1]!),
      });
    }
  }
  return entries;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
