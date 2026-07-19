import { describe, expect, it } from "vitest";
import { highlightCode } from "@/lib/chat/highlight-code";

describe("highlightCode", () => {
  it("highlights python keywords", () => {
    const html = highlightCode("def hello():\n    return 1\n", "python");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("def");
  });

  it("maps jsx to javascript", () => {
    const html = highlightCode("const x = 1;", "jsx");
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain("<script");
  });

  it("escapes plain text fallback safely", () => {
    const html = highlightCode("<b>x</b>", "text");
    expect(html).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
