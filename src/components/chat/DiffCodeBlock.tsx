"use client";

import { CodeBlock } from "@/components/chat/CodeBlock";
import { classifyDiffLine } from "@/lib/chat/diff-lines";
import { cn } from "@/lib/utils";

type DiffCodeBlockProps = {
  code: string;
  language?: string;
};

export function DiffCodeBlock({
  code,
  language = "diff",
}: DiffCodeBlockProps) {
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <CodeBlock language={language} code={code}>
      <code className="diff-code language-diff font-mono">
        {lines.map((line, i) => {
          const kind = classifyDiffLine(line);
          return (
            <span
              key={i}
              className={cn("diff-line", `diff-line-${kind}`)}
            >
              {line || " "}
              {i < lines.length - 1 ? "\n" : null}
            </span>
          );
        })}
      </code>
    </CodeBlock>
  );
}
