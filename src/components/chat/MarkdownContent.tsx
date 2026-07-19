"use client";

import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import {
  CodeBlock,
  extractCodeText,
  extractLanguage,
} from "@/components/chat/CodeBlock";
import { MarkdownTable } from "@/components/chat/MarkdownTable";
import { MermaidBlock } from "@/components/chat/MermaidBlock";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
};

type CodeProps = React.ComponentProps<"code"> & {
  inline?: boolean;
  node?: unknown;
};

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href);
}

function Hr(props: ComponentPropsWithoutRef<"hr">) {
  return <hr className="prose-hr" {...props} />;
}

function Img({ className, alt, ...props }: ComponentPropsWithoutRef<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? ""}
      loading="lazy"
      className={cn("prose-img", className)}
      {...props}
    />
  );
}

function Anchor({
  href,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const external = isExternalHref(href);
  return (
    <a
      href={href}
      className={cn(className)}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      {...props}
    >
      {children}
    </a>
  );
}

function TaskCheckbox({
  checked,
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      {...props}
      type="checkbox"
      checked={Boolean(checked)}
      disabled
      readOnly
      className={cn("prose-task-checkbox", className)}
    />
  );
}

function Pre({ children }: { children?: React.ReactNode }) {
  const childArray = Children.toArray(children);
  const child = childArray.length === 1 ? childArray[0] : null;

  if (
    child &&
    isValidElement(child) &&
    typeof child.props === "object" &&
    child.props !== null &&
    "className" in child.props
  ) {
    const codeEl = child as ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;
    const className = codeEl.props.className ?? "";
    const language = extractLanguage(className);
    const code = extractCodeText(codeEl.props.children);

    if (language === "mermaid") {
      return <MermaidBlock code={code} />;
    }

    if (className.includes("hljs") || className.includes("language-")) {
      return (
        <CodeBlock language={language} code={code}>
          {child}
        </CodeBlock>
      );
    }
  }

  return (
    <div className="my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-border">
      <pre className="m-0 max-w-full overflow-x-auto p-4 text-[0.8125rem] leading-relaxed">
        {children}
      </pre>
    </div>
  );
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
    <div className="prose-chat min-w-0 max-w-full overflow-x-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          pre: Pre,
          code: Code,
          table: MarkdownTable,
          hr: Hr,
          img: Img,
          a: Anchor,
          input: TaskCheckbox,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
