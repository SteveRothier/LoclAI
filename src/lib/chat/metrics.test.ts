import { describe, expect, it } from "vitest";
import { formatMessageMetrics } from "@/lib/chat/metrics";

describe("formatMessageMetrics", () => {
  it("formats tokens, speed and duration", () => {
    expect(
      formatMessageMetrics({
        promptTokens: 100,
        completionTokens: 48,
        durationMs: 1200,
      })
    ).toBe("48 tokens · 40 tok/s · 1.2 s");
  });
});
