"use client";

import { useCallback } from "react";
import {
  addMessage,
  deleteMessagesAfter,
  getConversation,
  getMessages,
  updateConversation,
  type Conversation,
  type Message,
} from "@/lib/db/schema";
import { fetchChatStream, type OllamaMessage } from "@/lib/ollama/client";
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

async function autoTitleFromFirstMessage(
  conversationId: string,
  userContent: string
): Promise<void> {
  const title = userContent.trim().slice(0, 48) || "Nouvelle conversation";
  await updateConversation(conversationId, {
    title: title.length >= 48 ? `${title}…` : title,
  });
}

export function useChatActions(conversationId: string | null) {
  const endpointUrl = useOllamaStore((s) => s.endpointUrl);
  const online = useOllamaStore((s) => s.online);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim() || !online) return;

      const conversation = await getConversation(conversationId);
      if (!conversation) return;

      const trimmed = content.trim();
      useChatStore.getState().setInputDraft("");

      const existingMessages = await getMessages(conversationId);
      const isFirstMessage = existingMessages.length === 0;

      await addMessage(conversationId, "user", trimmed);

      if (isFirstMessage) {
        await autoTitleFromFirstMessage(conversationId, trimmed);
        useConversationsRefreshStore.getState().bump();
      }

      const messagesAfterUser = await getMessages(conversationId);
      const ollamaMessages = buildOllamaMessages(conversation, messagesAfterUser);

      const controller = new AbortController();
      useChatStore.getState().setAbortController(controller);
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().setStreamingContent("");

      try {
        const result = await fetchChatStream({
          baseUrl: endpointUrl,
          model: conversation.model,
          messages: ollamaMessages,
          temperature: conversation.temperature,
          signal: controller.signal,
          onToken: (text) => useChatStore.getState().setStreamingContent(text),
        });

        if (result.content.trim()) {
          await addMessage(conversationId, "assistant", result.content);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message =
            error instanceof Error ? error.message : "Erreur inconnue";
          await addMessage(
            conversationId,
            "assistant",
            `⚠️ Erreur : ${message}`
          );
        }
      } finally {
        useChatStore.getState().resetStream();
        useConversationsRefreshStore.getState().bump();
      }
    },
    [conversationId, endpointUrl, online]
  );

  const regenerateFrom = useCallback(
    async (assistantMessageId: string) => {
      if (!conversationId || !online) return;

      const conversation = await getConversation(conversationId);
      if (!conversation) return;

      const allMessages = await getMessages(conversationId);
      const targetIndex = allMessages.findIndex((m) => m.id === assistantMessageId);
      if (targetIndex <= 0) return;

      const target = allMessages[targetIndex];
      await deleteMessagesAfter(conversationId, target.createdAt - 1);

      const messagesForContext = await getMessages(conversationId);
      const ollamaMessages = buildOllamaMessages(conversation, messagesForContext);

      const controller = new AbortController();
      useChatStore.getState().setAbortController(controller);
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().setStreamingContent("");

      try {
        const result = await fetchChatStream({
          baseUrl: endpointUrl,
          model: conversation.model,
          messages: ollamaMessages,
          temperature: conversation.temperature,
          signal: controller.signal,
          onToken: (text) => useChatStore.getState().setStreamingContent(text),
        });

        if (result.content.trim()) {
          await addMessage(conversationId, "assistant", result.content);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message =
            error instanceof Error ? error.message : "Erreur inconnue";
          await addMessage(
            conversationId,
            "assistant",
            `⚠️ Erreur : ${message}`
          );
        }
      } finally {
        useChatStore.getState().resetStream();
        useConversationsRefreshStore.getState().bump();
      }
    },
    [conversationId, endpointUrl, online]
  );

  return { sendMessage, regenerateFrom };
}
