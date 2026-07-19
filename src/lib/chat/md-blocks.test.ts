import { describe, expect, it } from "vitest";
import { parseCalloutMarker } from "@/lib/chat/markdown-callout";
import {
  isCustomMdBlock,
  isCustomMdBlockFence,
  parseBadges,
  parseDefinitionList,
  parseDetails,
  parseFileTree,
  parseHashSections,
  parseProgress,
  parseSteps,
  resolveMdBlockFence,
  resolveMdBlockKind,
} from "@/lib/chat/md-blocks";

describe("extended callouts", () => {
  it("parses new alert kinds and aliases", () => {
    expect(parseCalloutMarker("[!DANGER]\nX")?.kind).toBe("danger");
    expect(parseCalloutMarker("[!ERROR] boom")?.kind).toBe("error");
    expect(parseCalloutMarker("[!FAILURE] x")?.kind).toBe("error");
    expect(parseCalloutMarker("[!SUCCESS]")?.kind).toBe("success");
    expect(parseCalloutMarker("[!INFO] i")?.kind).toBe("info");
    expect(parseCalloutMarker("[!QUESTION]\n?")?.kind).toBe("question");
    expect(parseCalloutMarker("[!BUG] b")?.kind).toBe("bug");
    expect(parseCalloutMarker("[!EXAMPLE] e")?.kind).toBe("example");
  });
});

describe("md-blocks registry", () => {
  it("resolves aliases", () => {
    expect(resolveMdBlockKind("accordion")).toBe("details");
    expect(resolveMdBlockKind("console")).toBe("terminal");
    expect(resolveMdBlockKind("tree")).toBe("file-tree");
    expect(isCustomMdBlock("tabs")).toBe(true);
    expect(isCustomMdBlock("python")).toBe(false);
  });

  it("recovers custom blocks wrongly fenced as mermaid", () => {
    const hit = resolveMdBlockFence(
      "mermaid",
      "prompt\n> Demande\nréponse"
    );
    expect(hit).toEqual({
      kind: "prompt",
      code: "> Demande\nréponse",
    });
    expect(
      resolveMdBlockFence("mermaid", "steps\n1. Un\n2. Deux")?.kind
    ).toBe("steps");
    expect(isCustomMdBlockFence("mermaid", "toc\n## A")).toBe(true);
    expect(isCustomMdBlockFence("mermaid", "flowchart LR\n  A --> B")).toBe(
      false
    );
  });

  it("parses details / steps / tabs / badges / progress / tree / dl", () => {
    expect(parseDetails("Titre\n\nCorps")).toEqual({
      summary: "Titre",
      body: "Corps",
    });
    expect(parseSteps("1. Un\n- Deux")).toEqual(["Un", "Deux"]);
    expect(parseHashSections("## A\nhi\n## B\nbye")).toEqual([
      { title: "A", body: "hi" },
      { title: "B", body: "bye" },
    ]);
    expect(parseBadges("alpha\nbeta|success")).toEqual([
      { label: "alpha", tone: "default" },
      { label: "beta", tone: "success" },
    ]);
    expect(parseProgress("Done|80\n40")).toEqual([
      { label: "Done", value: 80 },
      { label: "", value: 40 },
    ]);
    expect(parseFileTree("src/\n  app.ts").map((n) => n.name)).toEqual([
      "src/",
      "app.ts",
    ]);
    expect(parseDefinitionList("CPU\n: Central unit\n\nRAM\n: Memory")).toEqual([
      { term: "CPU", def: "Central unit" },
      { term: "RAM", def: "Memory" },
    ]);
  });
});

/** Prompt de retest vague 2 — copier-coller dans le chat. */
export const MARKDOWN_BLOCKS_RETEST_PROMPT = `Réponds en UN seul message. Inclus exactement ces blocs (syntaxe inchangée) :

> [!SUCCESS]
> OK

> [!DANGER]
> Risque

> [!ERROR]
> Échec

> [!INFO]
> Info

> [!QUESTION]
> Pourquoi ?

> [!BUG]
> Régression

> [!EXAMPLE]
> Exemple

Emoji : :rocket: :sparkles:

\`\`\`details
Sources
Contenu détaillé **markdown**.
\`\`\`

\`\`\`spoiler
Réponse secrète
\`\`\`

\`\`\`steps
1. Installer
2. Configurer
3. Tester
\`\`\`

\`\`\`tabs
## JS
Utiliser console.log
## Python
Utiliser print
\`\`\`

\`\`\`cards
## Rapide
Faible latence
## Local
Sans cloud
\`\`\`

\`\`\`badges
stable|success
beta|warn
broken|danger
\`\`\`

\`\`\`terminal
npm test
npm run build
\`\`\`

\`\`\`file-tree
src/
  components/
    chat/
  lib/
\`\`\`

\`\`\`prompt
Tu es un assistant local utile.
\`\`\`

\`\`\`progress
Markdown|90
Mermaid|75
\`\`\`

\`\`\`toc
## Intro
## Blocs
## Fin
\`\`\`

\`\`\`dl
Latence
: Temps de réponse
Tokens
: Unités de génération
\`\`\`
`;

describe("MARKDOWN_BLOCKS_RETEST_PROMPT", () => {
  it("covers key fences and alerts", () => {
    expect(MARKDOWN_BLOCKS_RETEST_PROMPT).toContain("[!SUCCESS]");
    expect(MARKDOWN_BLOCKS_RETEST_PROMPT).toContain("```details");
    expect(MARKDOWN_BLOCKS_RETEST_PROMPT).toContain("```tabs");
    expect(MARKDOWN_BLOCKS_RETEST_PROMPT).toContain("```file-tree");
    expect(MARKDOWN_BLOCKS_RETEST_PROMPT).toContain(":rocket:");
  });
});
