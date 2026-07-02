"use client";

import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/db/schema";

type MessageBubbleProps = {
  message: Message;
  onCopy?: () => void;
  onRegenerate?: () => void;
  showActions?: boolean;
};

export function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  showActions = true,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[75%]",
          isUser
            ? "rounded-2xl bg-muted px-4 py-3"
            : "px-1 py-1"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground">
            {message.content}
          </p>
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {showActions && !isUser && (
          <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onCopy && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onCopy}
                title="Copier"
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-3.5" />
              </Button>
            )}
            {onRegenerate && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRegenerate}
                title="Régénérer"
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] px-1 py-1 sm:max-w-[75%]">
        {content ? (
          <MarkdownContent content={content} />
        ) : (
          <div className="flex items-center gap-1.5 py-2 text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
            <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
