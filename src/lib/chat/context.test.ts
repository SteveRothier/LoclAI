import { describe, expect, it } from "vitest";
import {
  buildOllamaMessages,
  DEFAULT_MAX_CONTEXT_MESSAGES,
  trimMessagesForContext,
} from "@/lib/chat/context";
import type { Conversation, Message } from "@/lib/db/schema";

function msg(role: Message["role"], content: string, index: number): Message {
  return {
    id: `m-${index}`,
    conversationId: "c1",
    role,
    content,
    createdAt: index,
  };
}

const conversation: Conversation = {
  id: "c1",
  title: "Test",
  model: "qwen3.5:4b",
  systemPrompt: "Tu es un assistant.",
  titleAuto: true,
  pinned: false,
  createdAt: 0,
  updatedAt: 0,
};

describe("trimMessagesForContext", () => {
  it("returns all messages when under limit", () => {
    const messages = [msg("user", "a", 1), msg("assistant", "b", 2)];
    const result = trimMessagesForContext(messages, 40);
    expect(result.messages).toHaveLength(2);
    expect(result.excludedCount).toBe(0);
  });

  it("keeps the most recent messages", () => {
    const messages = Array.from({ length: 50 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", `m${i}`, i)
    );
    const result = trimMessagesForContext(messages, 10);
    expect(result.messages).toHaveLength(10);
    expect(result.excludedCount).toBe(40);
    expect(result.messages[0]?.content).toBe("m40");
  });

  it("drops a leading assistant after trim to preserve pairs", () => {
    const messages = [
      ...Array.from({ length: 8 }, (_, i) =>
        msg(i % 2 === 0 ? "user" : "assistant", `old${i}`, i)
      ),
      msg("user", "u1", 8),
      msg("assistant", "a1", 9),
      msg("user", "u2", 10),
    ];
    const result = trimMessagesForContext(messages, 3);
    expect(result.messages[0]?.role).toBe("user");
    expect(result.messages.at(-1)?.content).toBe("u2");
  });

  it("ignores system role messages in history", () => {
    const messages = [
      msg("system", "hidden", 0),
      msg("user", "hi", 1),
      msg("assistant", "hello", 2),
    ];
    const result = trimMessagesForContext(messages, DEFAULT_MAX_CONTEXT_MESSAGES);
    expect(result.messages).toHaveLength(2);
    expect(result.messages.every((m) => m.role !== "system")).toBe(true);
  });
});

describe("buildOllamaMessages", () => {
  it("includes system prompt and trimmed chat messages", () => {
    const messages = [msg("user", "hello", 1), msg("assistant", "hi", 2)];
    const { messages: built, excludedCount } = buildOllamaMessages(
      conversation,
      messages,
      40
    );
    expect(excludedCount).toBe(0);
    expect(built).toEqual([
      { role: "system", content: "Tu es un assistant." },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ]);
  });

  it("reports excluded count when history is trimmed", () => {
    const messages = Array.from({ length: 6 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", `m${i}`, i)
    );
    const { messages: built, excludedCount } = buildOllamaMessages(
      conversation,
      messages,
      4
    );
    expect(excludedCount).toBe(2);
    expect(built).toHaveLength(5);
    expect(built[0]?.role).toBe("system");
  });
});
