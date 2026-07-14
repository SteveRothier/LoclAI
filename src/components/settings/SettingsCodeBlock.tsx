"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsCodeBlockProps = {
  code: string;
  label?: string;
};

export function SettingsCodeBlock({ code, label }: SettingsCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label ?? "PowerShell"}
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
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}
