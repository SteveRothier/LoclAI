"use client";

import { DiffCodeBlock } from "@/components/chat/DiffCodeBlock";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MdBlock } from "@/components/chat/MdBlock";
import { MermaidBlock } from "@/components/chat/MermaidBlock";
import { StreamingCodeBlock } from "@/components/chat/StreamingCodeBlock";
import {
  isMarkdownMistakenForMermaid,
  isMermaidSegment,
} from "@/lib/chat/mermaid-diagram-kinds";
import { resolveMdBlockFence } from "@/lib/chat/md-blocks";
import { parseStreamingSegments } from "@/lib/chat/streaming-markdown";

type AssistantContentProps = {
  content: string;
  /** Reserved for API compat; code path is identical in both modes. */
  mode?: "stream" | "final";
};

/**
 * Shared assistant body for streaming + persisted messages.
 * Mermaid + custom MD fences use dedicated renderers — not hljs.
 */
export function AssistantContent({
  content,
  mode: _mode = "final",
}: AssistantContentProps) {
  const segments = parseStreamingSegments(content);

  if (segments.length === 0) return null;

  const onlyText =
    segments.length === 1 && segments[0]!.kind === "text"
      ? segments[0]!
      : null;

  if (onlyText) {
    return <MarkdownContent content={onlyText.text} />;
  }

  return (
    <div className="prose-chat min-w-0 max-w-full overflow-x-hidden">
      {segments.map((seg, i) => {
        if (seg.kind === "code") {
          if (isMarkdownMistakenForMermaid(seg.language, seg.code)) {
            return <MarkdownContent key={`md-fence-${i}`} content={seg.code} />;
          }
          const custom = resolveMdBlockFence(seg.language, seg.code);
          if (custom) {
            return (
              <MdBlock
                key={`mdblock-${i}-${custom.kind}`}
                language={custom.kind}
                code={custom.code}
              />
            );
          }
          if (isMermaidSegment(seg.language, seg.code)) {
            return <MermaidBlock key={`mermaid-${i}`} code={seg.code} />;
          }
          if (seg.language === "diff") {
            return <DiffCodeBlock key={`diff-${i}`} code={seg.code} />;
          }
          return (
            <StreamingCodeBlock
              key={`code-${i}-${seg.language}`}
              language={seg.language}
              code={seg.code}
              incomplete={seg.incomplete}
            />
          );
        }
        if (seg.text.trim()) {
          return <MarkdownContent key={`md-${i}`} content={seg.text} />;
        }
        return <div key={`sp-${i}`} className="mb-3" aria-hidden />;
      })}
    </div>
  );
}
