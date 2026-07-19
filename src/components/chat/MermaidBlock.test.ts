import { describe, expect, it } from "vitest";
import {
  isLikelyFlowchartStatement,
  normalizeMermaidSource,
} from "@/lib/chat/normalize-mermaid";

describe("normalizeMermaidSource", () => {
  it("keeps valid mermaid arrows", () => {
    expect(normalizeMermaidSource("flowchart LR\n  A --> B")).toBe(
      "flowchart LR\n  A --> B"
    );
  });

  it("rewrites single and unicode arrows", () => {
    expect(normalizeMermaidSource("flowchart LR A->B")).toBe(
      "flowchart LR\nA --> B"
    );
    expect(normalizeMermaidSource("flowchart LR A→B")).toBe(
      "flowchart LR\nA --> B"
    );
  });

  it("rewrites (ID:label) nodes", () => {
    const out = normalizeMermaidSource(
      "graph TD;\n  C-->(D:Réponse générée);\n  E-->(F:Suite)"
    );
    expect(out).toContain("C --> D[Réponse générée]");
    expect(out).toContain("E --> F[Suite]");
  });

  it("quotes labels that contain apostrophes", () => {
    expect(
      normalizeMermaidSource("graph TD\n  D-->E[Validation par l'utilisateur]")
    ).toContain('E["Validation par l\'utilisateur"]');
  });

  it("repairs LLM flowchart with bad edge labels and sequence notes", () => {
    const raw = `graph TB
Utilisateur-->|Authentification|>Administrateur
note right of Utilisateur : Authentification requise.

Administrateur-->|Modification des données|>Base de données
note style: bold
Administrateur-->|Contraintes|>{stroke-width:0.5px}Administrateur`;

    const out = normalizeMermaidSource(raw);
    expect(out).toContain("Utilisateur -->|Authentification| Administrateur");
    expect(out).toContain("n_Base_de_donnees[Base de données]");
    expect(out).toContain(
      "Administrateur -->|Contraintes| Administrateur"
    );
    expect(out).not.toMatch(/note right of/i);
    expect(out).not.toMatch(/note style/i);
    expect(out).not.toMatch(/stroke-width/);
  });

  it("strips bogus class lines and quotes edge labels with apostrophes", () => {
    const raw = `graph TD;
Utilisateur[User] -->|requete d'authentification| Authentification[(Authentification)]
Administrateur -->|validation de l'inscription| Inscription
style Utilisateur fill:#f9f,stroke:#333,stroke-width:2px;
class Utilisateur>BaseDeDonnees>Authentification>Admin>Inscription> flowchart
class Utilisateur>>BaseDeDonnees>> flowchart`;

    const out = normalizeMermaidSource(raw);
    expect(out).toContain('|"requete d\'authentification"|');
    expect(out).toContain('|"validation de l\'inscription"|');
    expect(out).not.toMatch(/\bstyle\b/);
    expect(out).not.toMatch(/^class\b/m);
    expect(out).not.toContain(">>");
  });

  it("leaves gantt diagrams untouched", () => {
    const raw = `gantt
  title Projet
  dateFormat YYYY-MM-DD
  section Dev
  Analyse      :a1, 2023-02-01, 14d
  Développement :a2, after a1, 30d
  Tests        :a3, after a2, 10d`;
    expect(normalizeMermaidSource(raw)).toBe(raw);
  });

  it("drops prose / end note and fixes [[{decision}]]{~>} endpoints", () => {
    const raw = `graph TD
Utilisateur[User] -->|"requete d'authentification"| Authentification[(Authentification)]
Authentification -->|retour si OK| [[{validation des cred}]]{~>}
Utilisateur -->|requete de données| BaseDeDonnees[(Database)]

Si les informations sont valides, créer un compte.
end note`;

    const out = normalizeMermaidSource(raw);
    expect(out).toContain("n_validation_des_cred{validation des cred}");
    expect(out).not.toContain("{~>}");
    expect(out).not.toContain("end note");
    expect(out).not.toContain("Si les informations");
    expect(out).toContain("BaseDeDonnees[(Database)]");
  });
});

describe("isLikelyFlowchartStatement", () => {
  it("rejects french prose", () => {
    expect(
      isLikelyFlowchartStatement("Si les informations sont valides.")
    ).toBe(false);
  });

  it("accepts edges", () => {
    expect(isLikelyFlowchartStatement("A -->|x| B")).toBe(true);
  });
});
