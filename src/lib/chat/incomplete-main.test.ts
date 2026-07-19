import { describe, expect, it } from "vitest";
import {
  appendContinuation,
  hasEmptyMainBlock,
} from "@/lib/chat/incomplete-main";

describe("hasEmptyMainBlock", () => {
  it("detects empty if __name__ block", () => {
    const text = [
      "```python",
      "def main():",
      "    pass",
      'if __name__ == "__main__":',
      "",
      "```",
    ].join("\n");
    expect(hasEmptyMainBlock(text)).toBe(true);
  });

  it("returns false when main() is present", () => {
    const text = [
      "```python",
      "def main():",
      "    pass",
      'if __name__ == "__main__":',
      "    main()",
      "```",
    ].join("\n");
    expect(hasEmptyMainBlock(text)).toBe(false);
  });

  it("returns false without if __name__", () => {
    expect(hasEmptyMainBlock("print(1)")).toBe(false);
  });
});

describe("appendContinuation", () => {
  it("strips short overlap", () => {
    expect(appendContinuation("hello world", "world!")).toBe("hello world!");
  });
});
