"use client";

import { useState } from "react";
import { Check, Copy, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssistantContent } from "@/components/chat/AssistantContent";
import { formatMessageMetrics } from "@/lib/chat/metrics";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/db/schema";

type MessageBubbleProps = {
  message: Message;
  disabled?: boolean;
  onCopy?: () => void;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  showActions?: boolean;
};

function MessageActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MessageBubble({
  message,
  disabled = false,
  onCopy,
  onEdit,
  onRegenerate,
  showActions = true,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setEditing(false);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    onEdit?.(trimmed);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex min-w-0 w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative min-w-0",
          isUser
            ? "w-fit max-w-[min(100%,42rem)] sm:max-w-[min(92%,36rem)] lg:max-w-[min(85%,32rem)]"
            : "w-full max-w-full px-0 py-1 sm:px-1",
          editing && isUser && "w-full max-w-[min(100%,42rem)] sm:max-w-[min(92%,36rem)]"
        )}
      >
        {isUser ? (
          editing ? (
            <div className="rounded-2xl bg-muted px-4 py-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={disabled}
                rows={1}
                className={cn(
                  "min-h-0 resize-none border-0 bg-transparent p-0 shadow-none",
                  "text-[0.9375rem] leading-relaxed text-foreground",
                  "focus-visible:border-0 focus-visible:ring-0",
                  "field-sizing-content"
                )}
                autoFocus
              />
              <div className="mt-8 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={disabled}
                >
                  <X className="size-3.5" />
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveEdit}
                  disabled={disabled || !draft.trim()}
                >
                  <Check className="size-3.5" />
                  Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted px-4 py-3">
              <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground">
                {message.content}
              </p>
            </div>
          )
        ) : (
          <>
            <AssistantContent content={message.content} mode="final" />
            <div className="mt-1 min-h-4">
              {message.metrics ? (
                <p className="text-xs text-muted-foreground">
                  {formatMessageMetrics(message.metrics)}
                </p>
              ) : null}
            </div>
          </>
        )}

        {showActions && !editing && (
          <MessageActions className={isUser ? "justify-end" : "justify-start"}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleCopy()}
              title={copied ? "Copié" : "Copier"}
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
            {isUser && onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={startEdit}
                title="Modifier"
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {onRegenerate && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRegenerate}
                title="Régénérer"
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </MessageActions>
        )}
      </div>
    </div>
  );
}

export function StreamingBubble({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex min-w-0 w-full justify-start">
        <div className="min-w-0 w-full max-w-full overflow-hidden px-0 py-1 sm:px-1">
          <div className="py-2">
            <Loader variant="ellipsis" size="md" tone="primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full justify-start">
      <div className="min-w-0 w-full max-w-full overflow-hidden px-0 py-1 sm:px-1">
        <AssistantContent content={content} mode="stream" />
        {/* Same footprint as metrics line on the final bubble */}
        <div className="mt-1 min-h-4" aria-hidden />
      </div>
    </div>
  );
}
