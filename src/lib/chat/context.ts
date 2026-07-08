import type { Conversation, Message } from "@/lib/db/schema";
import type { OllamaMessage } from "@/lib/ollama/client";

export const DEFAULT_MAX_CONTEXT_MESSAGES = 40;
export const CHARS_PER_TOKEN_ESTIMATE = 4;

export type TrimContextResult = {
  messages: Message[];
  excludedCount: number;
};

export function trimMessagesForContext(
  messages: Message[],
  maxContextMessages: number
): TrimContextResult {
  const chatMessages = messages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );

  if (chatMessages.length <= maxContextMessages) {
    return { messages: chatMessages, excludedCount: 0 };
  }

  const excludedCount = chatMessages.length - maxContextMessages;
  let trimmed = chatMessages.slice(excludedCount);

  // Keep user/assistant pairs aligned: drop a lone leading assistant turn.
  if (trimmed[0]?.role === "assistant") {
    trimmed = trimmed.slice(1);
  }

  return {
    messages: trimmed,
    excludedCount: chatMessages.length - trimmed.length,
  };
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function estimateContextTokens(
  conversation: Conversation,
  messages: Message[],
  maxContextMessages: number = DEFAULT_MAX_CONTEXT_MESSAGES
): number {
  const { messages: ollamaMessages } = buildOllamaMessages(
    conversation,
    messages,
    maxContextMessages
  );
  return ollamaMessages.reduce(
    (total, message) => total + estimateTokenCount(message.content),
    0
  );
}

export function buildOllamaMessages(
  conversation: Conversation,
  messages: Message[],
  maxContextMessages: number = DEFAULT_MAX_CONTEXT_MESSAGES
): { messages: OllamaMessage[]; excludedCount: number } {
  const { messages: trimmed, excludedCount } = trimMessagesForContext(
    messages,
    maxContextMessages
  );

  const result: OllamaMessage[] = [];
  if (conversation.systemPrompt.trim()) {
    result.push({ role: "system", content: conversation.systemPrompt });
  }

  for (const msg of trimmed) {
    result.push({ role: msg.role as "user" | "assistant", content: msg.content });
  }

  return { messages: result, excludedCount };
}
