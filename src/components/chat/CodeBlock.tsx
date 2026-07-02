"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  language: string;
  code: string;
  children: React.ReactNode;
};

export function extractLanguage(className?: string): string {
  const match = /language-([\w-]+)/.exec(className ?? "");
  return match?.[1] ?? "text";
}

export function extractCodeText(children: React.ReactNode): string {
  if (typeof children === "string") return children.replace(/\n$/, "");
  if (Array.isArray(children)) {
    return children.map(extractCodeText).join("").replace(/\n$/, "");
  }
  if (children && typeof children === "object" && "props" in children) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>;
    return extractCodeText(el.props.children);
  }
  return "";
}

export function CodeBlock({ language, code, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block my-4 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground lowercase">
          {language}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            "text-muted-foreground hover:bg-background hover:text-foreground"
          )}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copié
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copier
            </>
          )}
        </button>
      </div>
      <pre className="code-block-pre overflow-x-auto p-4 text-[0.8125rem] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}
