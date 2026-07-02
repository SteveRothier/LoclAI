"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { ModelPicker } from "@/components/ollama/ModelPicker";
import { OllamaStatusBadge } from "@/components/ollama/OllamaStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/lib/db/hooks";
import {
  getConversation,
  updateConversation,
  type Conversation,
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
  const [showSettings, setShowSettings] = useState(false);
  const { messages } = useMessages(conversationId);
  const streaming = useChatStore((s) => s.streaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const inputDraft = useChatStore((s) => s.inputDraft);
  const online = useOllamaStore((s) => s.online);

  const { sendMessage, regenerateFrom, editUserMessage } = useChatActions(conversationId);

  useEffect(() => {
    void getConversation(conversationId).then((c) => setConversation(c ?? null));
  }, [conversationId]);

  const handleCopy = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  const handleSubmit = () => {
    if (!inputDraft.trim()) return;
    void sendMessage(inputDraft);
  };

  const updateConv = async (updates: Partial<Conversation>) => {
    await updateConversation(conversationId, updates);
    const updated = await getConversation(conversationId);
    setConversation(updated ?? null);
    useConversationsRefreshStore.getState().bump();
  };

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-b border-border py-4",
          CHAT_PADDING_CLASS
        )}
      >
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground">
            {conversation.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <OllamaStatusBadge compact />
          <ModelPicker
            value={conversation.model}
            onChange={(model) => void updateConv({ model })}
            disabled={streaming}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSettings((v) => !v)}
            title="Paramètres de conversation"
          >
            <Settings2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {showSettings && (
        <div
          className={cn(
            "shrink-0 space-y-4 border-b border-border bg-muted/30 py-5",
            CHAT_PADDING_CLASS
          )}
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Titre
            </label>
            <Input
              value={conversation.title}
              onChange={(e) => setConversation({ ...conversation, title: e.target.value })}
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
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Température ({conversation.temperature})
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={conversation.temperature}
              onChange={(e) => {
                const temperature = Number(e.target.value);
                setConversation({ ...conversation, temperature });
              }}
              onMouseUp={() => void updateConv({ temperature: conversation.temperature })}
              onTouchEnd={() => void updateConv({ temperature: conversation.temperature })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}

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
      />
    </div>
  );
}
