import { describe, expect, it } from "vitest";
import {
  firstMermaidContentLine,
  isMarkdownMistakenForMermaid,
  isMermaidDiagramSource,
  isMermaidFenceLanguage,
  isMermaidSegment,
  mermaidLeadingKeyword,
} from "@/lib/chat/mermaid-diagram-kinds";
import { detectDiagramKind } from "@/lib/chat/normalize-mermaid";

describe("isMermaidFenceLanguage", () => {
  it("accepts mermaid and mmd", () => {
    expect(isMermaidFenceLanguage("mermaid")).toBe(true);
    expect(isMermaidFenceLanguage("MMD")).toBe(true);
    expect(isMermaidFenceLanguage("python")).toBe(false);
  });
});

describe("isMermaidDiagramSource", () => {
  const cases: Array<[string, boolean]> = [
    ["flowchart TB\n  A --> B", true],
    ["graph LR\n  A --> B", true],
    ["sequenceDiagram\n  A->>B: hi", true],
    ["classDiagram\n  class Foo", true],
    ["stateDiagram-v2\n  [*] --> A", true],
    ["erDiagram\n  USER ||--o{ MSG : writes", true],
    ["requirementDiagram\n  requirement req1", true],
    ["journey\n  title T", true],
    ["gantt\n  title T", true],
    ["gitGraph\n  commit", true],
    ["pie title T\n  \"A\" : 1", true],
    ["quadrantChart\n  title T", true],
    ["mindmap\n  root((x))", true],
    ["timeline\n  title T", true],
    ["sankey-beta\n  A,B,10", true],
    ["xychart-beta\n  title T", true],
    ["block-beta\n  columns 1", true],
    ["packet-beta\n  0-15: Source", true],
    ["architecture-beta\n  group api", true],
    ["C4Context\n  title System", true],
    ["C4Container\n  title System", true],
    ["kanban\n  Todo\n    task1[Work]", true],
    ["radar-beta\n  title T", true],
    ["treemap-beta\n  \"A\"", true],
    ["def hello():\n  pass", false],
    ["", false],
  ];

  it.each(cases)("%j → %s", (src, expected) => {
    expect(isMermaidDiagramSource(src)).toBe(expected);
  });

  it("skips YAML front-matter before the keyword", () => {
    const src = `---
config:
  theme: dark
---
flowchart LR
  A --> B`;
    expect(firstMermaidContentLine(src)).toMatch(/^flowchart/i);
    expect(isMermaidDiagramSource(src)).toBe(true);
  });
});

describe("isMermaidSegment", () => {
  it("requires a real diagram body (not bare mermaid language)", () => {
    expect(isMermaidSegment("mermaid", "nonsense")).toBe(false);
    expect(isMermaidSegment("mermaid", "")).toBe(true);
    expect(isMermaidSegment("mermaid", "flowchart LR\n  A --> B")).toBe(true);
    expect(isMermaidSegment("text", "C4Context\n  title X")).toBe(true);
    expect(isMermaidSegment("python", "print(1)")).toBe(false);
  });
});

describe("isMarkdownMistakenForMermaid", () => {
  it("detects checklist tables wrongly fenced as mermaid", () => {
    const raw = `### Checklist
| Type | Attendu |
|------|---------|
| Tous | SVG |`;
    expect(isMarkdownMistakenForMermaid("mermaid", raw)).toBe(true);
    expect(
      isMarkdownMistakenForMermaid("mermaid", "block-beta\n  columns 3")
    ).toBe(false);
  });
});

describe("mermaidLeadingKeyword", () => {
  it("extracts the leading token", () => {
    expect(mermaidLeadingKeyword("C4Context")).toBe("c4context");
    expect(mermaidLeadingKeyword("stateDiagram-v2")).toBe("statediagram-v2");
  });
});

describe("detectDiagramKind", () => {
  it("classifies flowchart vs passthrough kinds", () => {
    expect(detectDiagramKind(["flowchart TD"])).toBe("flowchart");
    expect(detectDiagramKind(["sequenceDiagram"])).toBe("sequence");
    expect(detectDiagramKind(["gantt"])).toBe("gantt");
    expect(detectDiagramKind(["C4Context"])).toBe("c4");
    expect(detectDiagramKind(["kanban"])).toBe("kanban");
    expect(detectDiagramKind(["pie title X"])).toBe("chart");
    expect(detectDiagramKind(["radar-beta"])).toBe("chart");
    expect(detectDiagramKind(["architecture-beta"])).toBe("architecture");
    expect(detectDiagramKind(["block-beta"])).toBe("block");
  });
});
