"use client";

import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MermaidBlock } from "@/components/chat/MermaidBlock";
import { StreamingCodeBlock } from "@/components/chat/StreamingCodeBlock";
import { parseStreamingSegments } from "@/lib/chat/streaming-markdown";

type AssistantContentProps = {
  content: string;
  /** Reserved for API compat; code path is identical in both modes. */
  mode?: "stream" | "final";
};

const MERMAID_DIAGRAM_START =
  /^(graph|flowchart|sequencediagram|classdiagram|statediagram|erdiagram|gantt|pie|journey|gitgraph|mindmap|timeline|quadrantchart|sankey|xychart|block-beta|packet-beta|architecture)/i;

function isMermaidSegment(language: string, code: string): boolean {
  if (language.trim().toLowerCase() === "mermaid") return true;
  const first = code.trim().split("\n")[0]?.trim() ?? "";
  return MERMAID_DIAGRAM_START.test(first);
}

/**
 * Shared assistant body for streaming + persisted messages.
 * Mermaid fences (flowchart, gantt, sequence, …) use MermaidBlock — not hljs.
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
          if (isMermaidSegment(seg.language, seg.code)) {
            return <MermaidBlock key={`mermaid-${i}`} code={seg.code} />;
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
