"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { PersonaSelect } from "@/components/chat/PersonaSelect";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SectionLoading } from "@/components/ui/loader";
import { trimMessagesForContext, estimateContextTokens } from "@/lib/chat/context";
import { useMessages } from "@/lib/db/hooks";
import {
  getConversation,
  getSettings,
  updateConversation,
  type Conversation,
  type Persona,
} from "@/lib/db/schema";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useChatStore } from "@/stores/chat-store";
import { useOllamaStore } from "@/stores/ollama-store";
import { useConversationsRefreshStore } from "@/stores/conversations-store";
import { CHAT_PADDING_CLASS } from "@/lib/chat-layout";
import { cn } from "@/lib/utils";

type ChatViewProps = {
  conversationId: string;
};

export function ChatView({ conversationId }: ChatViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [maxContextMessages, setMaxContextMessages] = useState(40);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { messages } = useMessages(conversationId);
  const streaming = useChatStore((s) => s.streaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const excludedContextCount = useChatStore((s) => s.excludedContextCount);
  const inputDraft = useChatStore((s) => s.inputDraft);
  const online = useOllamaStore((s) => s.online);

  const { sendMessage, regenerateFrom, editUserMessage } = useChatActions(conversationId);

  useEffect(() => {
    setLoading(true);
    void Promise.all([getConversation(conversationId), getSettings()]).then(
      ([conversationResult, settings]) => {
        setConversation(conversationResult ?? null);
        setPersonas(settings.personas);
        setMaxContextMessages(settings.maxContextMessages);
        setLoading(false);
      }
    );
  }, [conversationId]);

  const projectedExcludedCount = useMemo(() => {
    return trimMessagesForContext(messages, maxContextMessages).excludedCount;
  }, [messages, maxContextMessages]);

  const contextExcludedCount = Math.max(excludedContextCount, projectedExcludedCount);

  const contextTokenEstimate = useMemo(() => {
    if (!conversation) return 0;
    return estimateContextTokens(conversation, messages, maxContextMessages);
  }, [conversation, messages, maxContextMessages]);

  const handleCopy = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  const handleSubmit = () => {
    if (!inputDraft.trim()) return;
    void sendMessage(inputDraft);
  };

  const updateConv = async (updates: Partial<Conversation>) => {
    const next = { ...updates };
    if ("title" in updates) {
      next.titleAuto = false;
    }
    await updateConversation(conversationId, next);
    const updated = await getConversation(conversationId);
    setConversation(updated ?? null);
    useConversationsRefreshStore.getState().bump();
  };

  if (loading) {
    return <SectionLoading />;
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">Conversation introuvable.</p>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {!online && (
        <div
          className={cn(
            "shrink-0 border-b border-primary/20 bg-primary/5 py-2.5 text-sm text-foreground",
            CHAT_PADDING_CLASS
          )}
        >
          Ollama est hors ligne.{" "}
          <Link href="/settings" className="font-medium text-primary hover:underline">
            Vérifier la configuration
          </Link>
        </div>
      )}

      <MessageList
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
        disabled={streaming}
        onCopy={handleCopy}
        onEdit={(id, content) => void editUserMessage(id, content)}
        onRegenerate={(id) => void regenerateFrom(id)}
      />

      <ChatInput
        value={inputDraft}
        onChange={(v) => useChatStore.getState().setInputDraft(v)}
        onSubmit={handleSubmit}
        onStop={() => useChatStore.getState().abortStream()}
        streaming={streaming}
        disabled={!online}
        model={conversation.model}
        onModelChange={(model) => void updateConv({ model })}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        contextNotice={
          contextExcludedCount > 0
            ? `${contextExcludedCount} message${contextExcludedCount > 1 ? "s" : ""} plus ancien${contextExcludedCount > 1 ? "s" : ""} exclus du contexte · ~${contextTokenEstimate.toLocaleString("fr-FR")} tokens estimés`
            : undefined
        }
        settingsPanel={
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Assistant
              </label>
              <PersonaSelect
                personas={personas}
                value={conversation.systemPrompt}
                disabled={streaming}
                onChange={(persona) => {
                  setConversation({ ...conversation, systemPrompt: persona.systemPrompt });
                  void updateConv({ systemPrompt: persona.systemPrompt });
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Titre
              </label>
              <Input
                value={conversation.title}
                onChange={(e) =>
                  setConversation({ ...conversation, title: e.target.value })
                }
                onBlur={() => void updateConv({ title: conversation.title })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                System prompt
              </label>
              <Textarea
                value={conversation.systemPrompt}
                onChange={(e) =>
                  setConversation({ ...conversation, systemPrompt: e.target.value })
                }
                onBlur={() => void updateConv({ systemPrompt: conversation.systemPrompt })}
                rows={3}
              />
            </div>
          </>
        }
      />
    </div>
  );
}
