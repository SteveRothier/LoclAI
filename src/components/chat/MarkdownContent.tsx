"use client";

import { Children, isValidElement, type ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  CodeBlock,
  extractCodeText,
  extractLanguage,
} from "@/components/chat/CodeBlock";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
};

type CodeProps = React.ComponentProps<"code"> & {
  inline?: boolean;
  node?: unknown;
};

function Pre({ children }: { children?: React.ReactNode }) {
  const child = Children.only(children);

  if (
    isValidElement(child) &&
    typeof child.props === "object" &&
    child.props !== null &&
    "className" in child.props
  ) {
    const codeEl = child as ReactElement<{ className?: string; children?: React.ReactNode }>;
    const className = codeEl.props.className ?? "";

    if (className.includes("hljs")) {
      const language = extractLanguage(className);
      const code = extractCodeText(codeEl.props.children);

      return (
        <CodeBlock language={language} code={code}>
          {child}
        </CodeBlock>
      );
    }
  }

  return <pre className="mb-3 overflow-x-auto rounded-lg">{children}</pre>;
}

function Code({ inline, className, children, ...props }: CodeProps) {
  if (inline) {
    return (
      <code
        className={cn(
          "rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <code className={cn("font-mono", className)} {...props}>
      {children}
    </code>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ pre: Pre, code: Code }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
