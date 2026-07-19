import { describe, expect, it } from "vitest";
import {
  applyMermaidNodePalette,
  extractFlowchartNodes,
} from "@/lib/chat/mermaid-palette";

describe("extractFlowchartNodes", () => {
  it("assigns roles from shapes and actor labels", () => {
    const src = `flowchart TB
  U[Utilisateur] -->|go| C[Créer une demande]
  C --> DB[(Base utilisateurs)]
  C --> V{Valide ?}
  V -->|Oui| OK[Accepté]
  S((Système de gestion))`;

    const nodes = extractFlowchartNodes(src);
    const role = (id: string) => nodes.find((n) => n.id === id)?.role;

    expect(role("U")).toBe("actor");
    expect(role("C")).toBe("process");
    expect(role("DB")).toBe("database");
    expect(role("V")).toBe("decision");
    expect(role("OK")).toBe("process");
    expect(role("S")).toBe("system");
  });
});

describe("applyMermaidNodePalette", () => {
  it("uses one class per role, not per node", () => {
    const out = applyMermaidNodePalette(
      "flowchart LR\nA[Étape 1] --> B[Étape 2]\nB --> C[(Base)]\nB --> D{Ok?}"
    );
    expect(out).toContain("classDef mProcess");
    expect(out).toContain("classDef mDatabase");
    expect(out).toContain("classDef mDecision");
    expect(out).toMatch(/class A,B mProcess|class B,A mProcess/);
    expect(out).toContain("class C mDatabase");
    expect(out).toContain("class D mDecision");
    expect(out).not.toContain("mEmerald");
    expect(out).not.toContain("mAmber");
  });
});
