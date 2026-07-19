import { describe, expect, it } from "vitest";
import { parseStreamingSegments } from "@/lib/chat/streaming-markdown";

describe("parseStreamingSegments", () => {
  it("keeps plain prose as text", () => {
    expect(parseStreamingSegments("Bonjour.")).toEqual([
      { kind: "text", text: "Bonjour." },
    ]);
  });

  it("renders an open fence as incomplete code without backticks", () => {
    const content =
      "Voici le code :\n\n```jsx\nimport React from 'react';\nconst NB_ARTICLES =";
    const segments = parseStreamingSegments(content);
    expect(segments).toEqual([
      { kind: "text", text: "Voici le code :\n" },
      {
        kind: "code",
        language: "jsx",
        code: "import React from 'react';\nconst NB_ARTICLES =",
        incomplete: true,
      },
    ]);
  });

  it("renders a closed fence as complete code", () => {
    const content = "Intro\n\n```python\nprint(1)\n```\n\nFin";
    expect(parseStreamingSegments(content)).toEqual([
      { kind: "text", text: "Intro\n" },
      { kind: "code", language: "python", code: "print(1)", incomplete: false },
      { kind: "text", text: "\nFin" },
    ]);
  });

  it("ignores mid-line triple backticks", () => {
    const content = ["```js", 'const s = "use ``` here";', "```"].join("\n");
    expect(parseStreamingSegments(content)).toEqual([
      {
        kind: "code",
        language: "js",
        code: 'const s = "use ``` here";',
        incomplete: false,
      },
    ]);
  });

  it("parses mermaid fences as code segments", () => {
    const content = ["```mermaid", "flowchart LR", "  A --> B", "```"].join(
      "\n"
    );
    expect(parseStreamingSegments(content)).toEqual([
      {
        kind: "code",
        language: "mermaid",
        code: "flowchart LR\n  A --> B",
        incomplete: false,
      },
    ]);
  });
});
