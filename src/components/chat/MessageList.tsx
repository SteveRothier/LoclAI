"use client";

import { useEffect, useRef } from "react";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import type { Message } from "@/lib/db/schema";

type MessageListProps = {
  messages: Message[];
  streaming: boolean;
  streamingContent: string;
  onCopy: (content: string) => void;
  onRegenerate: (messageId: string) => void;
};

export function MessageList({
  messages,
  streaming,
  streamingContent,
  onCopy,
  onRegenerate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-8 scrollbar-thin md:px-10">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={() => onCopy(message.content)}
          onRegenerate={
            message.role === "assistant"
              ? () => onRegenerate(message.id)
              : undefined
          }
        />
      ))}
      {streaming && <StreamingBubble content={streamingContent} />}
      <div ref={bottomRef} />
    </div>
  );
}
