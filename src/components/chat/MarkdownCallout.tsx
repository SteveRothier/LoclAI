"use client";

import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CircleHelp,
  Info,
  Lightbulb,
  OctagonAlert,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { CalloutKind } from "@/lib/chat/markdown-callout";
import { CALLOUT_LABELS } from "@/lib/chat/markdown-callout";
import { cn } from "@/lib/utils";

type MarkdownCalloutProps = {
  kind: CalloutKind;
  children: React.ReactNode;
};

const ICONS: Record<CalloutKind, typeof Info> = {
  note: Info,
  tip: Lightbulb,
  warning: AlertTriangle,
  important: ShieldAlert,
  caution: OctagonAlert,
  danger: OctagonAlert,
  error: XCircle,
  success: CheckCircle2,
  info: Info,
  question: CircleHelp,
  bug: Bug,
  example: Sparkles,
};

export function MarkdownCallout({ kind, children }: MarkdownCalloutProps) {
  const Icon = ICONS[kind];
  return (
    <aside
      className={cn(
        "md-callout mb-3 rounded-lg border px-3 py-2.5",
        `md-callout-${kind}`
      )}
      data-callout={kind}
      role="note"
    >
      <div className="md-callout-title mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="size-4 shrink-0" aria-hidden />
        {CALLOUT_LABELS[kind]}
      </div>
      <div className="md-callout-body text-[0.9375rem] leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
