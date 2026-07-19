"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Workflow,
  X,
} from "lucide-react";
import {
  coerceMermaidSource,
  normalizeMermaidSource,
} from "@/lib/chat/normalize-mermaid";
import { applyMermaidNodePalette } from "@/lib/chat/mermaid-palette";
import { cn } from "@/lib/utils";

export { normalizeMermaidSource } from "@/lib/chat/normalize-mermaid";

type MermaidBlockProps = {
  code: string;
};

type RenderStatus = "loading" | "ready" | "error";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;

async function getMermaid() {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        suppressErrorRendering: true,
        themeVariables: {
          darkMode: true,
          background: "#0d1117",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          fontSize: "15px",
          primaryColor: "#16352c",
          primaryTextColor: "#ecfdf5",
          primaryBorderColor: "#10b981",
          secondaryColor: "#1f2937",
          secondaryTextColor: "#f3f4f6",
          secondaryBorderColor: "#6b7280",
          tertiaryColor: "#111827",
          tertiaryTextColor: "#e5e7eb",
          tertiaryBorderColor: "#4b5563",
          mainBkg: "#16352c",
          nodeBkg: "#16352c",
          nodeBorder: "#10b981",
          nodeTextColor: "#ecfdf5",
          lineColor: "#9ca3af",
          textColor: "#f3f4f6",
          titleColor: "#f3f4f6",
          edgeLabelBackground: "#161b22",
          clusterBkg: "#111827",
          clusterBorder: "#374151",
          noteBkgColor: "#1f2937",
          noteTextColor: "#f3f4f6",
          noteBorderColor: "#6b7280",
        },
        flowchart: {
          htmlLabels: true,
          curve: "linear",
          padding: 12,
          nodeSpacing: 36,
          rankSpacing: 48,
          diagramPadding: 12,
          useMaxWidth: false,
          wrappingWidth: 200,
        },
        gantt: {
          useMaxWidth: false,
          barHeight: 32,
          barGap: 8,
          topPadding: 50,
          leftPadding: 100,
          gridLineStartPadding: 16,
          fontSize: 14,
          sectionFontSize: 14,
          numberSectionStyles: 2,
        },
      });
      return mermaid;
    });
  }
  return mermaidReady;
}

function removeMermaidArtifacts(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
  document.querySelectorAll(`[id^="d${id}"]`).forEach((el) => el.remove());
}

function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function measureSvg(host: HTMLElement): { w: number; h: number } {
  const svg = host.querySelector("svg");
  if (!svg) return { w: 0, h: 0 };
  svg.style.width = "";
  svg.style.height = "";
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  const w =
    svg.getBBox?.().width ||
    svg.scrollWidth ||
    svg.clientWidth ||
    Number(svg.viewBox?.baseVal?.width) ||
    0;
  const h =
    svg.getBBox?.().height ||
    svg.scrollHeight ||
    svg.clientHeight ||
    Number(svg.viewBox?.baseVal?.height) ||
    0;
  return { w: Math.ceil(w), h: Math.ceil(h) };
}

/**
 * Official mermaid.js SVG render with zoom / expand for readability.
 */
export function MermaidBlock({ code }: MermaidBlockProps) {
  const reactId = useId().replace(/:/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [renderFor, setRenderFor] = useState<{
    code: string;
    source: string;
    status: RenderStatus;
    repaired: boolean;
  }>({ code: "", source: "", status: "loading", repaired: false });

  const active = renderFor.code === code;
  const status = active ? renderFor.status : ("loading" as const);
  const source = active
    ? renderFor.source
    : normalizeMermaidSource(code);
  const viewingSource =
    status === "error" || (showSource && active && status === "ready");
  const showErrorBanner =
    status === "error" && active && !errorDismissed;

  useEffect(() => {
    let cancelled = false;
    const renderId = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`;

    async function renderDiagram() {
      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = "";

      try {
        const mermaid = await getMermaid();
        const coerced = await coerceMermaidSource(code, (text) =>
          mermaid.parse(text)
        );
        if (cancelled) return;

        if (!coerced) {
          setErrorDismissed(false);
          setNatural({ w: 0, h: 0 });
          setRenderFor({
            code,
            source: normalizeMermaidSource(code),
            status: "error",
            repaired: false,
          });
          setShowSource(true);
          return;
        }

        const painted = applyMermaidNodePalette(coerced.source);
        let renderSource = coerced.source;
        try {
          await mermaid.parse(painted);
          renderSource = painted;
        } catch {
          // Palette optional
        }

        const { svg } = await mermaid.render(renderId, renderSource);
        if (cancelled) {
          removeMermaidArtifacts(renderId);
          return;
        }
        host.innerHTML = svg;
        const size = measureSvg(host);
        setNatural(size);
        setZoom(1);
        setShowSource(false);
        setRenderFor({
          code,
          source: coerced.source,
          status: "ready",
          repaired: coerced.repaired,
        });
      } catch {
        removeMermaidArtifacts(renderId);
        if (!cancelled) {
          setErrorDismissed(false);
          setNatural({ w: 0, h: 0 });
          setRenderFor({
            code,
            source: normalizeMermaidSource(code),
            status: "error",
            repaired: false,
          });
          setShowSource(true);
        }
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
      removeMermaidArtifacts(renderId);
    };
  }, [code, reactId]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const zoomReset = () => setZoom(1);

  const onWheelZoom = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setZoom((z) =>
      clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
    );
  };

  const toolbarBtn = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
    "text-muted-foreground hover:bg-background hover:text-foreground"
  );

  const scaledW = natural.w > 0 ? natural.w * zoom : undefined;
  const scaledH = natural.h > 0 ? natural.h * zoom : undefined;

  return (
    <>
      {expanded && (
        <div
          className="my-4 h-12 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
          aria-hidden
        >
          Diagramme ouvert en grand — Esc pour fermer
        </div>
      )}

      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          aria-hidden
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        className={cn(
          "mermaid-block min-w-0 max-w-full overflow-hidden border border-border bg-[#0d1117]",
          expanded
            ? "fixed left-1/2 top-1/2 z-50 flex max-h-[min(92vh,960px)] w-[min(96vw,1200px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl shadow-2xl"
            : "relative my-4 rounded-xl"
        )}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded || undefined}
        aria-label={expanded ? "Diagramme Mermaid agrandi" : undefined}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Mermaid
          </span>
          <div className="flex flex-wrap items-center justify-end gap-0.5">
            {status === "ready" && !viewingSource && (
              <>
                <button
                  type="button"
                  title="Zoom arrière"
                  aria-label="Zoom arrière"
                  onClick={zoomOut}
                  disabled={zoom <= ZOOM_MIN}
                  className={cn(toolbarBtn, "disabled:opacity-40")}
                >
                  <Minus className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Réinitialiser le zoom"
                  onClick={zoomReset}
                  className={cn(toolbarBtn, "min-w-11 tabular-nums")}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  title="Zoom avant"
                  aria-label="Zoom avant"
                  onClick={zoomIn}
                  disabled={zoom >= ZOOM_MAX}
                  className={cn(toolbarBtn, "disabled:opacity-40")}
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  title={expanded ? "Réduire" : "Agrandir"}
                  aria-label={expanded ? "Réduire" : "Agrandir"}
                  onClick={() => setExpanded((v) => !v)}
                  className={toolbarBtn}
                >
                  {expanded ? (
                    <Minimize2 className="size-3.5" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                </button>
              </>
            )}
            {status === "ready" && (
              <button
                type="button"
                title={viewingSource ? "Voir le diagramme" : "Voir le code"}
                onClick={() => setShowSource((v) => !v)}
                className={cn(
                  toolbarBtn,
                  viewingSource && "bg-background text-foreground"
                )}
              >
                {viewingSource ? (
                  <>
                    <Workflow className="size-3.5" />
                    Diagramme
                  </>
                ) : (
                  <>
                    <Code2 className="size-3.5" />
                    Code
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={toolbarBtn}
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
            {expanded && (
              <button
                type="button"
                title="Fermer"
                aria-label="Fermer"
                onClick={() => setExpanded(false)}
                className={toolbarBtn}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {showErrorBanner && (
          <div className="flex shrink-0 items-start gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="min-w-0 flex-1 pt-0.5">
              Impossible de récupérer un diagramme valide — source affichée.
            </p>
            <button
              type="button"
              title="Fermer"
              aria-label="Fermer"
              onClick={() => setErrorDismissed(true)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {status === "loading" && !viewingSource && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Rendu du diagramme…
          </div>
        )}

        <div
          hidden={viewingSource || status !== "ready"}
          onWheel={onWheelZoom}
          className={cn(
            "mermaid-viewport min-h-0 flex-1 overflow-auto",
            expanded ? "p-4" : "max-h-[min(60vh,480px)] p-4"
          )}
        >
          <div
            style={{
              width: scaledW,
              height: scaledH,
              position: "relative",
            }}
          >
            <div
              ref={hostRef}
              className="mermaid-host absolute top-0 left-0 text-[#e6edf3]"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: natural.w || undefined,
                height: natural.h || undefined,
              }}
            />
          </div>
        </div>

        {viewingSource && (
          <pre className="m-0 max-h-[min(60vh,480px)] max-w-full flex-1 overflow-auto border-t border-border p-4 text-[0.8125rem] leading-relaxed text-[#e6edf3]">
            <code className="font-mono whitespace-pre-wrap">{source}</code>
          </pre>
        )}
      </div>
    </>
  );
}
