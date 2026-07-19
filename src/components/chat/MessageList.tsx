"use client";

import { useEffect, useRef } from "react";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { StreamErrorBoundary } from "@/components/chat/StreamErrorBoundary";
import { CHAT_CONTENT_CLASS, CHAT_PADDING_CLASS } from "@/lib/chat-layout";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/db/schema";

type MessageListProps = {
  messages: Message[];
  streaming: boolean;
  streamingContent: string;
  onCopy: (content: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onRegenerate: (messageId: string) => void;
  disabled?: boolean;
};

export function MessageList({
  messages,
  streaming,
  streamingContent,
  onCopy,
  onEdit,
  onRegenerate,
  disabled = false,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, streaming]);

  if (messages.length === 0 && !streaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            Bienvenue sur LoclAI
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vos conversations restent sur cet appareil. L&apos;inférence passe
            directement par Ollama — aucune donnée n&apos;est envoyée au cloud.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-6 scrollbar-thin sm:py-8",
        CHAT_PADDING_CLASS
      )}
    >
      <div className={cn(CHAT_CONTENT_CLASS, "flex min-w-0 flex-col gap-6")}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            disabled={disabled}
            onCopy={() => onCopy(message.content)}
            onEdit={
              message.role === "user"
                ? (newContent) => onEdit(message.id, newContent)
                : undefined
            }
            onRegenerate={() => onRegenerate(message.id)}
          />
        ))}
        {streaming &&
          !(
            streamingContent &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content === streamingContent
          ) && (
            <StreamErrorBoundary content={streamingContent}>
              <StreamingBubble content={streamingContent} />
            </StreamErrorBoundary>
          )}
      </div>
    </div>
  );
}
