"use client";

import { useCallback } from "react";
import {
  addMessage,
  deleteMessagesAfter,
  getConversation,
  getMessages,
  getSettings,
  updateConversation,
  updateMessage,
  type Conversation,
} from "@/lib/db/schema";
import { buildOllamaMessages } from "@/lib/chat/context";
import { generateConversationTitle } from "@/lib/chat/title";
import {
  appendWithoutOverlap,
  buildContinuationMessages,
  extractRequestedMinLines,
  fetchChatStream,
  formatModelNotFoundError,
  isModelAvailable,
  isRedundantContinuation,
  mergeStreamMetrics,
  resolveStreamDisplayContent,
  shouldContinueGeneration,
  userAskedForLongOutput,
  MAX_STREAM_CONTINUATIONS,
  type ChatStreamMetrics,
  type ChatStreamResult,
  type OllamaMessage,
} from "@/lib/ollama/client";
import { useConversationsRefreshStore } from "@/stores/conversations-store";
import { useChatStore } from "@/stores/chat-store";
import { useOllamaStore } from "@/stores/ollama-store";

const EMPTY_REPLY_MESSAGE =
  "⚠️ Aucune réponse du modèle. Réessayez ou régénérez la réponse.";

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

function resolveAssistantContent(result: ChatStreamResult): string {
  return (
    resolveStreamDisplayContent(result.content, result.thinking) ||
    EMPTY_REPLY_MESSAGE
  );
}

async function streamUntilComplete(
  endpointUrl: string,
  model: string,
  baseMessages: OllamaMessage[],
  signal: AbortSignal,
  onToken: (text: string) => void,
  numPredict: number
): Promise<{
  content: string;
  thinking: string;
  aborted: boolean;
  metrics?: ChatStreamMetrics;
}> {
  let messages = baseMessages;
  let content = "";
  let thinking = "";
  let metrics: ChatStreamMetrics | undefined;
  let aborted = false;
  let doneReason: string | undefined;
  let previousLength = 0;

  const wantsLong = userAskedForLongOutput(baseMessages);
  const minCodeLines = extractRequestedMinLines(baseMessages);

  for (let round = 0; round <= MAX_STREAM_CONTINUATIONS; round++) {
    const result = await fetchChatStream({
      baseUrl: endpointUrl,
      model,
      messages,
      signal,
      numPredict,
      onToken: (chunkContent) => {
        const combined =
          round === 0 ? chunkContent : content + chunkContent;
        onToken(combined);
      },
    });

    aborted = result.aborted;
    doneReason = result.doneReason;
    metrics = mergeStreamMetrics(metrics, result.metrics);

    if (round === 0) {
      content = result.content;
      thinking = result.thinking;
    } else {
      if (isRedundantContinuation(content, result.content)) break;
      content = appendWithoutOverlap(content, result.content);
      if (result.thinking.trim()) {
        thinking = appendWithoutOverlap(thinking, result.thinking);
      }
    }

    if (aborted) break;

    const displaySoFar = resolveStreamDisplayContent(content, thinking);
    onToken(displaySoFar);

    const keepGoing = shouldContinueGeneration(displaySoFar, doneReason, round, {
      wantsLong,
      minCodeLines,
    });
    if (!keepGoing) break;

    if (round > 0 && displaySoFar.length <= previousLength) break;
    previousLength = displaySoFar.length;

    if (round === MAX_STREAM_CONTINUATIONS) break;
    if (!result.content.trim() && !result.thinking.trim()) break;

    messages = buildContinuationMessages(baseMessages, displaySoFar);
  }

  return { content, thinking, aborted, metrics };
}

async function streamAssistantReply(
  conversationId: string,
  conversation: Conversation,
  endpointUrl: string
): Promise<{ content: string; aborted: boolean }> {
  const settings = await getSettings();
  const messagesForContext = await getMessages(conversationId);
  const { messages: ollamaMessages, excludedCount } = buildOllamaMessages(
    conversation,
    messagesForContext,
    settings.maxContextMessages
  );

  useChatStore.getState().setExcludedContextCount(excludedCount);

  const controller = new AbortController();
  useChatStore.getState().setAbortController(controller);
  useChatStore.getState().setStreamingContent("");

  let assistantContent = "";
  let aborted = false;

  try {
    const result = await streamUntilComplete(
      endpointUrl,
      conversation.model,
      ollamaMessages,
      controller.signal,
      (text) => useChatStore.getState().setStreamingContent(text),
      settings.maxPredictTokens
    );

    aborted = result.aborted;

    if (aborted && !result.content.trim() && !result.thinking.trim()) {
      return { content: "", aborted: true };
    }

    assistantContent = resolveAssistantContent({
      content: result.content,
      thinking: result.thinking,
      aborted: result.aborted,
      metrics: result.metrics,
    });

    if (assistantContent.trim()) {
      await addMessage(
        conversationId,
        "assistant",
        assistantContent,
        result.metrics
      );
    }

    return { content: assistantContent, aborted };
  } catch (error) {
    if (!controller.signal.aborted) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      assistantContent = `⚠️ Erreur : ${message}`;
      await addMessage(conversationId, "assistant", assistantContent);
      return { content: assistantContent, aborted: false };
    }
    return { content: "", aborted: true };
  } finally {
    useChatStore.getState().resetStream();
    useConversationsRefreshStore.getState().bump();
  }
}

function tryBeginRequest(): boolean {
  return useChatStore.getState().beginRequest();
}

export function useChatActions(conversationId: string | null) {
  const endpointUrl = useOllamaStore((s) => s.endpointUrl);
  const online = useOllamaStore((s) => s.online);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim() || !online) return;
      if (!tryBeginRequest()) return;

      const trimmed = content.trim();
      useChatStore.getState().setInputDraft("");

      try {
        const conversation = await getConversation(conversationId);
        if (!conversation) return;

        const modelError = await ensureModelAvailable(conversation.model);
        if (modelError) {
          await addMessage(conversationId, "assistant", `⚠️ Erreur : ${modelError}`);
          useConversationsRefreshStore.getState().bump();
          return;
        }

        const existingMessages = await getMessages(conversationId);
        const isFirstMessage = existingMessages.length === 0;

        await addMessage(conversationId, "user", trimmed);
        useConversationsRefreshStore.getState().bump();

        const { content: assistantContent, aborted } = await streamAssistantReply(
          conversationId,
          conversation,
          endpointUrl
        );

        if (
          isFirstMessage &&
          !aborted &&
          assistantContent.trim() &&
          !assistantContent.startsWith("⚠️")
        ) {
          await maybeGenerateConversationTitle(
            conversationId,
            conversation,
            trimmed,
            assistantContent,
            endpointUrl
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        await addMessage(conversationId, "assistant", `⚠️ Erreur : ${message}`);
        useConversationsRefreshStore.getState().bump();
      } finally {
        if (useChatStore.getState().streaming) {
          useChatStore.getState().resetStream();
        }
      }
    },
    [conversationId, endpointUrl, online]
  );

  const regenerateFrom = useCallback(
    async (assistantMessageId: string) => {
      if (!conversationId || !online) return;
      if (!tryBeginRequest()) return;

      try {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        await addMessage(conversationId, "assistant", `⚠️ Erreur : ${message}`);
        useConversationsRefreshStore.getState().bump();
      } finally {
        if (useChatStore.getState().streaming) {
          useChatStore.getState().resetStream();
        }
      }
    },
    [conversationId, endpointUrl, online]
  );

  const editUserMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!conversationId || !online) return;

      const trimmed = newContent.trim();
      if (!trimmed) return;
      if (!tryBeginRequest()) return;

      try {
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

        const { content: assistantContent, aborted } = await streamAssistantReply(
          conversationId,
          conversation,
          endpointUrl
        );

        if (
          isFirstMessage &&
          !aborted &&
          assistantContent.trim() &&
          !assistantContent.startsWith("⚠️")
        ) {
          await maybeGenerateConversationTitle(
            conversationId,
            conversation,
            trimmed,
            assistantContent,
            endpointUrl
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        await addMessage(conversationId, "assistant", `⚠️ Erreur : ${message}`);
        useConversationsRefreshStore.getState().bump();
      } finally {
        if (useChatStore.getState().streaming) {
          useChatStore.getState().resetStream();
        }
      }
    },
    [conversationId, endpointUrl, online]
  );

  return { sendMessage, regenerateFrom, editUserMessage };
}
