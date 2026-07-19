"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import {
  extractTocEntries,
  parseBadges,
  parseDefinitionList,
  parseDetails,
  parseFileTree,
  parseHashSections,
  parseProgress,
  parseSteps,
  resolveMdBlockKind,
  type MdBlockKind,
} from "@/lib/chat/md-blocks";
import { cn } from "@/lib/utils";

type MdBlockProps = {
  language: string;
  code: string;
};

function NestedMd({ content }: { content: string }) {
  if (!content.trim()) return null;
  return <MarkdownContent content={content} nested />;
}

function DetailsBlock({ code }: { code: string }) {
  const { summary, body } = parseDetails(code);
  return (
    <details className="md-block md-block-details my-4 overflow-hidden rounded-xl border border-border">
      <summary className="cursor-pointer select-none bg-muted/50 px-4 py-2.5 text-sm font-semibold text-foreground">
        {summary}
      </summary>
      <div className="border-t border-border px-4 py-3">
        <NestedMd content={body} />
      </div>
    </details>
  );
}

function SpoilerBlock({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md-block md-block-spoiler my-4 rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-muted/50 px-4 py-2.5 text-left text-sm font-medium text-foreground"
      >
        {open ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {open ? "Masquer" : "Révéler le spoiler"}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <NestedMd content={code} />
        </div>
      )}
    </div>
  );
}

function StepsBlock({ code }: { code: string }) {
  const steps = parseSteps(code);
  return (
    <ol className="md-block md-block-steps my-4 list-none space-y-3 pl-0">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="md-step-num flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5 text-[0.9375rem] leading-relaxed">
            <NestedMd content={step} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function TabsBlock({ code }: { code: string }) {
  const sections = parseHashSections(code);
  const [active, setActive] = useState(0);
  if (sections.length === 0) return null;
  const idx = Math.min(active, sections.length - 1);
  return (
    <div className="md-block md-block-tabs my-4 overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-1.5">
        {sections.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              i === idx
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="px-4 py-3">
        <NestedMd content={sections[idx]!.body} />
      </div>
    </div>
  );
}

function CardsBlock({ code }: { code: string }) {
  const sections = parseHashSections(code);
  return (
    <div className="md-block md-block-cards my-4 grid gap-3 sm:grid-cols-2">
      {sections.map((s, i) => (
        <article
          key={i}
          className="rounded-xl border border-border bg-muted/20 px-4 py-3"
        >
          <h4 className="mb-2 text-sm font-semibold text-foreground">{s.title}</h4>
          <NestedMd content={s.body} />
        </article>
      ))}
    </div>
  );
}

function BadgesBlock({ code }: { code: string }) {
  const items = parseBadges(code);
  return (
    <div className="md-block md-block-badges my-3 flex flex-wrap gap-2">
      {items.map((b, i) => (
        <span
          key={i}
          className={cn("md-badge", `md-badge-${b.tone}`)}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

function TerminalBlock({ code }: { code: string }) {
  const lines = code.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  return (
    <div className="md-block md-block-terminal my-4 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-1.5 border-b border-border bg-[#161b22] px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f56]" />
        <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="size-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-[10px] text-[#8b949e]">terminal</span>
      </div>
      <pre className="m-0 overflow-x-auto bg-[#0d1117] p-4 text-[0.8125rem] leading-relaxed text-[#e6edf3]">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="block">
              <span className="text-[#3fb950]">$ </span>
              {line}
              {i < lines.length - 1 ? "\n" : null}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function FileTreeBlock({ code }: { code: string }) {
  const nodes = parseFileTree(code);
  return (
    <div className="md-block md-block-file-tree my-4 overflow-hidden rounded-xl border border-border bg-muted/20 px-4 py-3 font-mono text-[0.8125rem]">
      {nodes.map((n, i) => (
        <div
          key={i}
          className="leading-relaxed text-foreground"
          style={{ paddingLeft: `${n.depth * 1.1}rem` }}
        >
          {n.name.endsWith("/") || !n.name.includes(".") ? (
            <span className="text-primary">{n.name}</span>
          ) : (
            n.name
          )}
        </div>
      ))}
    </div>
  );
}

function PromptBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="md-block md-block-prompt my-4 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          Prompt
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap p-4 text-[0.8125rem] leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}

function ProgressBlock({ code }: { code: string }) {
  const items = parseProgress(code);
  return (
    <div className="md-block md-block-progress my-4 space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{item.label || "Progression"}</span>
            <span className="tabular-nums">{item.value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="md-progress-bar h-full rounded-full transition-[width]"
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TocBlock({ code }: { code: string }) {
  const entries = extractTocEntries(code);
  if (entries.length === 0) {
    return (
      <p className="my-3 text-sm text-muted-foreground">
        Table des matières vide — ajoutez des titres <code>##</code> ou des liens.
      </p>
    );
  }
  return (
    <nav className="md-block md-block-toc my-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sommaire
      </p>
      <ol className="ml-4 list-decimal space-y-1 text-sm">
        {entries.map((e, i) => (
          <li key={i}>
            <a href={`#${e.slug}`} className="text-primary hover:underline">
              {e.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function DlBlock({ code }: { code: string }) {
  const items = parseDefinitionList(code);
  return (
    <dl className="md-block md-block-dl my-4 space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/15 px-3 py-2">
          <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
          <dd className="mt-1 text-[0.9375rem] text-muted-foreground">
            <NestedMd content={item.def} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

const RENDERERS: Record<MdBlockKind, (code: string) => ReactNode> = {
  details: (c) => <DetailsBlock code={c} />,
  spoiler: (c) => <SpoilerBlock code={c} />,
  steps: (c) => <StepsBlock code={c} />,
  tabs: (c) => <TabsBlock code={c} />,
  cards: (c) => <CardsBlock code={c} />,
  badges: (c) => <BadgesBlock code={c} />,
  terminal: (c) => <TerminalBlock code={c} />,
  "file-tree": (c) => <FileTreeBlock code={c} />,
  prompt: (c) => <PromptBlock code={c} />,
  progress: (c) => <ProgressBlock code={c} />,
  toc: (c) => <TocBlock code={c} />,
  dl: (c) => <DlBlock code={c} />,
};

export function MdBlock({ language, code }: MdBlockProps) {
  const kind = resolveMdBlockKind(language);
  if (!kind) return null;
  return <>{RENDERERS[kind](code)}</>;
}
