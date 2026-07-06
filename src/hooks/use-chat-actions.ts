"use client";

import { useCallback } from "react";
import {
  addMessage,
  deleteMessagesAfter,
  getConversation,
  getMessages,
  updateConversation,
  updateMessage,
  type Conversation,
  type Message,
} from "@/lib/db/schema";
import { generateConversationTitle } from "@/lib/chat/title";
import {
  fetchChatStream,
  formatModelNotFoundError,
  isModelAvailable,
  type OllamaMessage,
} from "@/lib/ollama/client";
import { useConversationsRefreshStore } from "@/stores/conversations-store";
import { useChatStore } from "@/stores/chat-store";
import { useOllamaStore } from "@/stores/ollama-store";

function buildOllamaMessages(
  conversation: Conversation,
  messages: Message[]
): OllamaMessage[] {
  const result: OllamaMessage[] = [];
  if (conversation.systemPrompt.trim()) {
    result.push({ role: "system", content: conversation.systemPrompt });
  }
  for (const msg of messages) {
    if (msg.role === "user" || msg.role === "assistant") {
      result.push({ role: msg.role, content: msg.content });
    }
  }
  return result;
}

async function maybeGenerateConversationTitle(
  conversationId: string,
  conversation: Conversation,
  userContent: string,
  assistantContent: string,
  endpointUrl: string
): Promise<void> {
  if (conversation.titleAuto === false) return;

  const title = await generateConversationTitle(
    endpointUrl,
    conversation.model,
    userContent,
    assistantContent
  );

  await updateConversation(conversationId, { title, titleAuto: true });
  useConversationsRefreshStore.getState().bump();
}

async function ensureModelAvailable(model: string): Promise<string | null> {
  await useOllamaStore.getState().refresh();
  const models = useOllamaStore.getState().models;

  if (!isModelAvailable(model, models)) {
    return formatModelNotFoundError(model, models);
  }

  return null;
}

async function streamAssistantReply(
  conversationId: string,
  conversation: Conversation,
  endpointUrl: string
): Promise<string> {
  const messagesForContext = await getMessages(conversationId);
  const ollamaMessages = buildOllamaMessages(conversation, messagesForContext);

  const controller = new AbortController();
  useChatStore.getState().setAbortController(controller);
  useChatStore.getState().setStreaming(true);
  useChatStore.getState().setStreamingContent("");

  let assistantContent = "";

  try {
    const result = await fetchChatStream({
      baseUrl: endpointUrl,
      model: conversation.model,
      messages: ollamaMessages,
      signal: controller.signal,
      onToken: (text) => useChatStore.getState().setStreamingContent(text),
    });

    assistantContent = result.content;

    if (assistantContent.trim()) {
      await addMessage(conversationId, "assistant", assistantContent);
    }

    return assistantContent;
  } catch (error) {
    if (!controller.signal.aborted) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      assistantContent = `⚠️ Erreur : ${message}`;
      await addMessage(conversationId, "assistant", assistantContent);
    }
    return assistantContent;
  } finally {
    useChatStore.getState().resetStream();
    useConversationsRefreshStore.getState().bump();
  }
}

export function useChatActions(conversationId: string | null) {
  const endpointUrl = useOllamaStore((s) => s.endpointUrl);
  const online = useOllamaStore((s) => s.online);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim() || !online) return;

      const conversation = await getConversation(conversationId);
      if (!conversation) return;

      const modelError = await ensureModelAvailable(conversation.model);
      if (modelError) {
        await addMessage(conversationId, "assistant", `⚠️ Erreur : ${modelError}`);
        useConversationsRefreshStore.getState().bump();
        return;
      }

      const trimmed = content.trim();
      useChatStore.getState().setInputDraft("");

      const existingMessages = await getMessages(conversationId);
      const isFirstMessage = existingMessages.length === 0;

      await addMessage(conversationId, "user", trimmed);

      const assistantContent = await streamAssistantReply(
        conversationId,
        conversation,
        endpointUrl
      );

      if (isFirstMessage && assistantContent.trim() && !assistantContent.startsWith("⚠️")) {
        await maybeGenerateConversationTitle(
          conversationId,
          conversation,
          trimmed,
          assistantContent,
          endpointUrl
        );
      }
    },
    [conversationId, endpointUrl, online]
  );

  const regenerateFrom = useCallback(
    async (assistantMessageId: string) => {
      if (!conversationId || !online) return;

      const conversation = await getConversation(conversationId);
      if (!conversation) return;

      const modelError = await ensureModelAvailable(conversation.model);
      if (modelError) {
        await addMessage(conversationId, "assistant", `⚠️ Erreur : ${modelError}`);
        useConversationsRefreshStore.getState().bump();
        return;
      }

      const allMessages = await getMessages(conversationId);
      const targetIndex = allMessages.findIndex((m) => m.id === assistantMessageId);
      if (targetIndex <= 0) return;

      const target = allMessages[targetIndex];
      await deleteMessagesAfter(conversationId, target.createdAt - 1);

      await streamAssistantReply(conversationId, conversation, endpointUrl);
    },
    [conversationId, endpointUrl, online]
  );

  const editUserMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!conversationId || !online) return;

      const trimmed = newContent.trim();
      if (!trimmed) return;

      const conversation = await getConversation(conversationId);
      if (!conversation) return;

      const modelError = await ensureModelAvailable(conversation.model);
      if (modelError) {
        await addMessage(conversationId, "assistant", `⚠️ Erreur : ${modelError}`);
        useConversationsRefreshStore.getState().bump();
        return;
      }

      const allMessages = await getMessages(conversationId);
      const target = allMessages.find((m) => m.id === messageId);
      if (!target || target.role !== "user") return;

      const isFirstMessage = allMessages[0]?.id === messageId;

      await updateMessage(messageId, trimmed);
      await deleteMessagesAfter(conversationId, target.createdAt);

      const assistantContent = await streamAssistantReply(
        conversationId,
        conversation,
        endpointUrl
      );

      if (isFirstMessage && assistantContent.trim() && !assistantContent.startsWith("⚠️")) {
        await maybeGenerateConversationTitle(
          conversationId,
          conversation,
          trimmed,
          assistantContent,
          endpointUrl
        );
      }
    },
    [conversationId, endpointUrl, online]
  );

  return { sendMessage, regenerateFrom, editUserMessage };
}
