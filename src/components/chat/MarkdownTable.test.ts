import { describe, expect, it } from "vitest";
import { rowsToMarkdown } from "@/components/chat/MarkdownTable";

describe("rowsToMarkdown", () => {
  it("builds a GFM table from a matrix", () => {
    expect(
      rowsToMarkdown([
        ["A", "B"],
        ["1", "2"],
      ])
    ).toBe(["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"));
  });
});
