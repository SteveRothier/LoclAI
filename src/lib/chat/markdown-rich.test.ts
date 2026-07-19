import { describe, expect, it } from "vitest";
import { parseCalloutMarker } from "@/lib/chat/markdown-callout";
import { classifyDiffLine } from "@/lib/chat/diff-lines";

describe("parseCalloutMarker", () => {
  it("parses GitHub alert markers", () => {
    expect(parseCalloutMarker("[!NOTE]\nHello")).toEqual({
      kind: "note",
      rest: "Hello",
    });
    expect(parseCalloutMarker("[!TIP] Astuce")).toEqual({
      kind: "tip",
      rest: "Astuce",
    });
    expect(parseCalloutMarker("[!WARNING]\nX")).toEqual({
      kind: "warning",
      rest: "X",
    });
    expect(parseCalloutMarker("[!IMPORTANT]")).toEqual({
      kind: "important",
      rest: "",
    });
    expect(parseCalloutMarker("[!CAUTION]\nDanger")).toEqual({
      kind: "caution",
      rest: "Danger",
    });
  });

  it("rejects plain blockquotes", () => {
    expect(parseCalloutMarker("Just a quote")).toBeNull();
    expect(parseCalloutMarker("[note] no")).toBeNull();
  });
});

describe("classifyDiffLine", () => {
  it("classifies unified diff lines", () => {
    expect(classifyDiffLine("--- a/file")).toBe("meta");
    expect(classifyDiffLine("+++ b/file")).toBe("meta");
    expect(classifyDiffLine("@@ -1,2 +1,3 @@")).toBe("hunk");
    expect(classifyDiffLine("+added")).toBe("add");
    expect(classifyDiffLine("-removed")).toBe("del");
    expect(classifyDiffLine(" context")).toBe("ctx");
  });
});

/** Copier-coller dans le chat pour valider les nouveaux types Markdown. */
export const MARKDOWN_RICH_RETEST_PROMPT = `Réponds en UN seul message Markdown. Inclus exactement :

#### Titre h4
##### Titre h5
###### Titre h6

Ligne1
Ligne2 soft-break (deux lignes sans ligne vide entre elles).

> [!NOTE]
> Ceci est une note LoclAI.

> [!TIP]
> Astuce utile.

> [!IMPORTANT]
> Point important.

> [!WARNING]
> Attention requise.

> [!CAUTION]
> Risque élevé.

Voici une note de bas de page[^1].

[^1]: Source de la footnote GFM.

\`\`\`diff
--- a/app.ts
+++ b/app.ts
@@ -1,3 +1,4 @@
 keep
-old
+new
+extra
\`\`\`

Checklist :
- [x] Callouts
- [x] Footnotes
- [x] h4–h6
- [x] diff
`;

describe("MARKDOWN_RICH_RETEST_PROMPT", () => {
  it("covers callouts, footnotes, headings, and diff", () => {
    expect(MARKDOWN_RICH_RETEST_PROMPT).toContain("[!NOTE]");
    expect(MARKDOWN_RICH_RETEST_PROMPT).toContain("[^1]");
    expect(MARKDOWN_RICH_RETEST_PROMPT).toContain("#### Titre h4");
    expect(MARKDOWN_RICH_RETEST_PROMPT).toContain("```diff");
  });
});
