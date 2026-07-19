"use client";

import { useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

function cellText(cell: Element): string {
  return (cell.textContent ?? "").replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}

/** Build a GFM markdown table from a matrix of cell strings. */
export function rowsToMarkdown(matrix: string[][]): string {
  if (matrix.length === 0) return "";
  const colCount = Math.max(...matrix.map((r) => r.length), 0);
  if (colCount === 0) return "";

  const normalized = matrix.map((r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push("");
    return copy;
  });

  const header = normalized[0]!;
  const sep = Array.from({ length: colCount }, () => "---");
  const body = normalized.slice(1);
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;

  return [line(header), line(sep), ...body.map(line)].join("\n");
}

/** Rebuild a GFM markdown table from a live HTML table. */
export function tableToMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  const matrix = rows.map((row) =>
    Array.from(row.querySelectorAll("th, td")).map(cellText)
  );
  return rowsToMarkdown(matrix);
}

export function MarkdownTable({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const table = tableRef.current;
    if (!table) return;
    const md = tableToMarkdown(table);
    if (!md) return;
    await navigator.clipboard.writeText(md);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="md-table my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Tableau</span>
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
      <div className="min-w-0 overflow-x-auto">
        <table
          ref={tableRef}
          className={cn("md-table-el w-full", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
}
