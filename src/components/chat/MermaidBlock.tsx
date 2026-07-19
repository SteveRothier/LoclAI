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
import {
  getMermaidThemeVariables,
  type MermaidColorMode,
} from "@/lib/chat/mermaid-theme";
import { cn } from "@/lib/utils";

export { normalizeMermaidSource } from "@/lib/chat/normalize-mermaid";

type MermaidBlockProps = {
  code: string;
};

type RenderStatus = "loading" | "ready" | "error";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

let mermaidMod: typeof import("mermaid").default | null = null;
let mermaidMode: MermaidColorMode | null = null;

async function getMermaid(mode: MermaidColorMode) {
  if (!mermaidMod) {
    mermaidMod = (await import("mermaid")).default;
  }
  if (mermaidMode !== mode) {
    mermaidMod.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      suppressErrorRendering: true,
      themeVariables: getMermaidThemeVariables(mode),
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
        numberSectionStyles: 4,
      },
    });
    mermaidMode = mode;
  }
  return mermaidMod;
}

function readColorMode(): MermaidColorMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
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
  const [colorMode, setColorMode] = useState<MermaidColorMode>(() =>
    readColorMode()
  );
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
    const root = document.documentElement;
    const sync = () => {
      const next = readColorMode();
      setColorMode((prev) => (prev === next ? prev : next));
    };
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const renderId = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`;

    async function renderDiagram() {
      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = "";

      try {
        const mermaid = await getMermaid(colorMode);
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

        const painted = applyMermaidNodePalette(coerced.source, colorMode);
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
  }, [code, reactId, colorMode]);

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
  const isLight = colorMode === "light";

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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm dark:bg-black/70"
          aria-hidden
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        className={cn(
          "mermaid-block min-w-0 max-w-full overflow-hidden border border-border",
          isLight ? "mermaid-light bg-white" : "mermaid-dark bg-[#0f0f0f]",
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
            "mermaid-viewport flex min-h-0 flex-1 justify-center overflow-auto",
            expanded ? "items-center p-6" : "items-start p-5 max-h-[min(60vh,480px)]"
          )}
        >
          <div
            className="relative shrink-0"
            style={{
              width: scaledW,
              height: scaledH,
            }}
          >
            <div
              ref={hostRef}
              className={cn(
                "mermaid-host absolute top-0 left-0",
                isLight ? "text-foreground" : "text-[#ecfdf5]"
              )}
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
          <pre
            className={cn(
              "m-0 max-h-[min(60vh,480px)] max-w-full flex-1 overflow-auto border-t border-border p-4 text-[0.8125rem] leading-relaxed",
              isLight ? "bg-muted/40 text-foreground" : "text-[#e6edf3]"
            )}
          >
            <code className="font-mono whitespace-pre-wrap">{source}</code>
          </pre>
        )}
      </div>
    </>
  );
}
