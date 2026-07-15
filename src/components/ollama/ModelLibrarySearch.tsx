"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import {
  getMainLibraryTags,
  getOllamaLibraryModelTags,
  isModelInstalled,
  searchOllamaLibrary,
  type LibrarySearchResult,
} from "@/lib/ollama/library";
import { cn } from "@/lib/utils";

type ModelLibrarySearchProps = {
  value: string;
  onChange: (value: string) => void;
  onDownload: () => void;
  installedNames: string[];
  disabled?: boolean;
  downloading?: boolean;
};

export function ModelLibrarySearch({
  value,
  onChange,
  onDownload,
  installedNames,
  disabled,
  downloading,
}: ModelLibrarySearchProps) {
  const [results, setResults] = useState<LibrarySearchResult[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const allowDropdownRef = useRef(false);

  const query = value.trim();
  const hasSearchQuery = query.length >= 2;

  useEffect(() => {
    if (!hasSearchQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);

      void searchOllamaLibrary(query, controller.signal)
        .then((items) => {
          setResults(items);
          if (allowDropdownRef.current) {
            setOpen(true);
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearchError(
            error instanceof Error ? error.message : "Recherche impossible."
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, hasSearchQuery]);

  const resetSearchUi = () => {
    setResults([]);
    setTagOptions([]);
    setSelectedModelId(null);
    setSearchError(null);
    setOpen(false);
    setSearching(false);
    allowDropdownRef.current = false;
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selectModel = async (modelId: string) => {
    allowDropdownRef.current = false;
    setSelectedModelId(modelId);
    onChange(modelId);
    setOpen(false);
    setTagOptions([]);
    setLoadingTags(true);

    try {
      const details = await getOllamaLibraryModelTags(modelId);
      const mainTags = getMainLibraryTags(details.tags);
      setTagOptions(mainTags);

      if (details.defaultTag) {
        onChange(details.defaultTag);
      } else if (mainTags[0]) {
        onChange(mainTags[0]);
      }
    } catch {
      setTagOptions([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const showVariants =
    hasSearchQuery && !!selectedModelId && tagOptions.length > 1;

  const showResults =
    open && hasSearchQuery && !disabled && !showVariants;

  const visibleResults = hasSearchQuery ? results : [];
  const showSearching = hasSearchQuery && searching;

  return (
    <div ref={containerRef} className="relative z-30 space-y-3">
      <div className="relative flex flex-col gap-2 sm:flex-row">
        <div className="relative z-30 min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              if (!next.trim()) {
                resetSearchUi();
              } else {
                allowDropdownRef.current = true;
                setSelectedModelId(null);
                setTagOptions([]);
                setOpen(true);
              }
              onChange(next);
            }}
            onFocus={() => {
              allowDropdownRef.current = true;
              if (hasSearchQuery && !showVariants) {
                setOpen(true);
              }
            }}
            placeholder="Rechercher un modèle — ex. deepseek, llama3.2, qwen"
            disabled={disabled}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setOpen(false);
                void onDownload();
              }
              if (e.key === "Escape") setOpen(false);
            }}
          />

          {(showSearching || loadingTags) && (
            <Loader variant="ring" size="sm" tone="muted" className="absolute top-1/2 right-3 -translate-y-1/2" />
          )}

          {showResults && (
            <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg scrollbar-none">
              {searchError && (
                <p className="px-4 py-3 text-sm text-destructive">{searchError}</p>
              )}

              {!searchError && visibleResults.length === 0 && !showSearching && (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Aucun modèle trouvé sur ollama.com
                </p>
              )}

              {!searchError &&
                visibleResults.map((result) => {
                  const installed = isModelInstalled(result.modelId, installedNames);
                  return (
                    <button
                      key={result.modelId}
                      type="button"
                      onClick={() => void selectModel(result.modelId)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {result.modelId}
                        </p>
                        <p className="text-xs text-muted-foreground">Bibliothèque Ollama</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {installed && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            Installé
                          </span>
                        )}
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground"
                          title="Voir sur ollama.com"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={() => {
            allowDropdownRef.current = false;
            setOpen(false);
            void onDownload();
          }}
          disabled={disabled || !value.trim() || downloading}
          className="shrink-0"
        >
          <Download className="size-4" />
          {downloading ? "Téléchargement…" : "Télécharger"}
        </Button>
      </div>

      {showVariants && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Variantes disponibles</p>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  allowDropdownRef.current = false;
                  setOpen(false);
                  onChange(tag);
                }}
                disabled={disabled}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  value === tag
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {tag.split(":")[1] ?? tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
