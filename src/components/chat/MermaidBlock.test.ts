import { describe, expect, it } from "vitest";
import {
  isLikelyFlowchartStatement,
  normalizeMermaidSource,
  convertBlockBetaToFlowchart,
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

  it("strips title, quotes dotted labels, and fixes architecture arrows", () => {
    const raw = `architecture-beta
  title Architecture du système
  group api(cloud)[API]
  service web(server)[Next.js] in api
  service ollama(server)[Ollama] in api
  web:R -> L:ollama`;
    const out = normalizeMermaidSource(raw);
    expect(out).not.toMatch(/\btitle\b/);
    expect(out).toContain('service web(server)["Next.js"]');
    expect(out).toContain("web:R --> L:ollama");
  });

  it("strips title from block-beta and drops a duplicated diagram", () => {
    const raw = `block-beta
  title Architecture du système
  columns 3
  Frontend Frontend Frontend
  space:3
  API API DB
block-beta
  columns 3
  Frontend Frontend Frontend
  space:3
  API API DB`;
    const out = normalizeMermaidSource(raw);
    expect(out).not.toMatch(/\btitle\b/);
    expect(out).toContain("columns 3");
    expect(out.match(/^block-beta\b/gim)?.length ?? 0).toBe(1);
  });

  it("converts simple block-beta layouts to flowchart", () => {
    const raw = `block-beta
  columns 3
  Frontend Frontend Frontend
  space:3
  API API DB`;
    const out = convertBlockBetaToFlowchart(raw);
    expect(out).toMatch(/^flowchart TB/);
    expect(out).toContain('b0["Frontend"]');
    expect(out).toContain('b5["DB"]');
    expect(out).toContain("row0 --> row1");
  });

  it("rewrites sankey flowchart edges to CSV", () => {
    const raw = `sankey-beta
  title Flux
  Users[Utilisateur] -->|40%|> Chat[Système]
  Users -->|10%|> Settings
  Chat -->|35%|> Ollama`;
    const out = normalizeMermaidSource(raw);
    expect(out).toContain("Users,Chat,40");
    expect(out).toContain("Users,Settings,10");
    expect(out).toContain("Chat,Ollama,35");
    expect(out).not.toMatch(/\btitle\b/);
  });

  it('rewrites sankey "A,B" : N into CSV', () => {
    const raw = `sankey-beta
"Users,Chat" : 50
"Users,Markdown" : 30
"Chat,Ollama" : 20`;
    const out = normalizeMermaidSource(raw);
    expect(out).toBe(
      ["sankey-beta", "Users,Chat,50", "Users,Markdown,30", "Chat,Ollama,20"].join(
        "\n"
      )
    );
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

  it("rewrites fake architecture participants to flowchart", () => {
    const raw = `architecture participants A[API] B[Front-end]
  A -->|requete| B
  B -->|réponse| A`;
    const out = normalizeMermaidSource(raw);
    expect(out).toMatch(/^flowchart/);
    expect(out).toContain("A[API]");
    expect(out).toContain("B[Front-end]");
    expect(out).toContain("A -->|requete| B");
  });

  it("rewrites C4 title inline to C4Context", () => {
    const raw = `C4 title System Context - LoclAI
  Person(user, "Utilisateur", "Utilise le chat local")
  System(loclai, "LoclAI", "Chat hors ligne")
  System_Ext(ollama, "Ollama", "Inférence locale")`;
    const out = normalizeMermaidSource(raw);
    expect(out.startsWith("C4Context")).toBe(true);
    expect(out).toContain("title System Context - LoclAI");
    expect(out).toContain('Person(user, "Utilisateur"');
  });

  it("rewrites radar title inline to radar-beta", () => {
    const raw = `radar title Comparaison modèles
  axis A["Vitesse"], B["Qualité"], C["Contexte"]
  curve c1["Petit modèle"]{60, 40, 30}
  curve c2["Grand modèle"]{40, 85, 80}`;
    const out = normalizeMermaidSource(raw);
    expect(out.startsWith("radar-beta")).toBe(true);
    expect(out).toContain("title Comparaison modèles");
    expect(out).toContain('curve c1["Petit modèle"]{60, 40, 30}');
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
