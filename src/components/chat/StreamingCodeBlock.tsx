"use client";

import { useMemo } from "react";
import { CodeBlock } from "@/components/chat/CodeBlock";
import { highlightCode } from "@/lib/chat/highlight-code";
import { cn } from "@/lib/utils";

type StreamingCodeBlockProps = {
  language: string;
  code: string;
  /** Kept for API compat; header matches final CodeBlock (Copier). */
  incomplete?: boolean;
};

/**
 * Same shell + hljs styling as the final message CodeBlock,
 * so finishing the stream doesn't cause a visual jump.
 */
export function StreamingCodeBlock({
  language,
  code,
}: StreamingCodeBlockProps) {
  const html = useMemo(
    () => highlightCode(code, language),
    [code, language]
  );

  return (
    <CodeBlock language={language || "text"} code={code}>
      <code
        className={cn("hljs", `language-${language || "text"}`)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </CodeBlock>
  );
}
