"use client";

import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { StreamingCodeBlock } from "@/components/chat/StreamingCodeBlock";
import { parseStreamingSegments } from "@/lib/chat/streaming-markdown";

type AssistantContentProps = {
  content: string;
  /** Reserved for API compat; code path is identical in both modes. */
  mode?: "stream" | "final";
};

/**
 * Shared assistant body for streaming + persisted messages.
 * Same code-block DOM in both modes → no visual jump when generation ends.
 */
export function AssistantContent({
  content,
  mode: _mode = "final",
}: AssistantContentProps) {
  const segments = parseStreamingSegments(content);

  if (segments.length === 0) return null;

  // No fences: full markdown
  const onlyText =
    segments.length === 1 && segments[0]!.kind === "text"
      ? segments[0]!
      : null;

  if (onlyText) {
    return <MarkdownContent content={onlyText.text} />;
  }

  return (
    <div className="prose-chat min-w-0 max-w-full overflow-x-hidden">
      {segments.map((seg, i) =>
        seg.kind === "code" ? (
          <StreamingCodeBlock
            key={`code-${i}-${seg.language}`}
            language={seg.language}
            code={seg.code}
            incomplete={seg.incomplete}
          />
        ) : seg.text.trim() ? (
          <MarkdownContent key={`md-${i}`} content={seg.text} />
        ) : (
          <div key={`sp-${i}`} className="mb-3" aria-hidden />
        )
      )}
    </div>
  );
}
