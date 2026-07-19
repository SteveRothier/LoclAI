"use client";

import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import {
  CodeBlock,
  extractCodeText,
  extractLanguage,
} from "@/components/chat/CodeBlock";
import { DiffCodeBlock } from "@/components/chat/DiffCodeBlock";
import { MarkdownCallout } from "@/components/chat/MarkdownCallout";
import { MarkdownTable } from "@/components/chat/MarkdownTable";
import { MdBlock } from "@/components/chat/MdBlock";
import { MermaidBlock } from "@/components/chat/MermaidBlock";
import {
  isMarkdownMistakenForMermaid,
  isMermaidSegment,
} from "@/lib/chat/mermaid-diagram-kinds";
import { resolveMdBlockFence } from "@/lib/chat/md-blocks";
import { parseCalloutMarker } from "@/lib/chat/markdown-callout";
import { cn } from "@/lib/utils";
import remarkGemoji from "remark-gemoji";

type MarkdownContentProps = {
  content: string;
  /** Nested render (inside details/tabs) — skip custom fences to avoid loops. */
  nested?: boolean;
};

type CodeProps = React.ComponentProps<"code"> & {
  inline?: boolean;
  node?: unknown;
};

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href);
}

function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return getNodeText(props.children);
  }
  return "";
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

function Blockquote({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"blockquote">) {
  const kids = Children.toArray(children);
  const chunks: string[] = [];
  for (const kid of kids) {
    const t = (
      isValidElement(kid)
        ? getNodeText((kid.props as { children?: ReactNode }).children)
        : getNodeText(kid)
    ).trim();
    if (t) chunks.push(t);
  }

  const head = chunks[0] ?? "";
  const parsed = parseCalloutMarker(head);
  if (parsed) {
    const bodyMd = [parsed.rest.trim(), ...chunks.slice(1)]
      .filter(Boolean)
      .join("\n\n");
    return (
      <MarkdownCallout kind={parsed.kind}>
        {bodyMd ? <MarkdownContent content={bodyMd} nested /> : null}
      </MarkdownCallout>
    );
  }

  return (
    <blockquote className={cn(className)} {...props}>
      {children}
    </blockquote>
  );
}

function Heading({
  level,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"h1"> & { level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag className={cn(`prose-h${level}`, className)} {...props}>
      {children}
    </Tag>
  );
}

function Pre({
  children,
  nested,
}: {
  children?: React.ReactNode;
  nested?: boolean;
}) {
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

    if (isMarkdownMistakenForMermaid(language, code)) {
      return <MarkdownContent content={code} nested />;
    }

    if (!nested) {
      const custom = resolveMdBlockFence(language, code);
      if (custom) {
        return <MdBlock language={custom.kind} code={custom.code} />;
      }
    }

    if (isMermaidSegment(language, code)) {
      return <MermaidBlock code={code} />;
    }

    if (language === "diff") {
      return <DiffCodeBlock code={code} />;
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

export function MarkdownContent({
  content,
  nested = false,
}: MarkdownContentProps) {
  return (
    <div className="prose-chat min-w-0 max-w-full overflow-x-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkGemoji, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          pre: (p) => <Pre nested={nested} {...p} />,
          code: Code,
          table: MarkdownTable,
          hr: Hr,
          img: Img,
          a: Anchor,
          input: TaskCheckbox,
          blockquote: Blockquote,
          h1: (p) => <Heading level={1} {...p} />,
          h2: (p) => <Heading level={2} {...p} />,
          h3: (p) => <Heading level={3} {...p} />,
          h4: (p) => <Heading level={4} {...p} />,
          h5: (p) => <Heading level={5} {...p} />,
          h6: (p) => <Heading level={6} {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
