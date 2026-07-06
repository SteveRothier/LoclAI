"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  warnings?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warnings = [],
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loading = false,
  loadingLabel = "En cours…",
  onConfirm,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onOpenChange(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, loading, onOpenChange]);

  if (!open) return null;

  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (loading) return;
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={
          description || warnings.length > 0 ? "confirm-dialog-description" : undefined
        }
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>

        <div className="flex gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>

            {(description || warnings.length > 0) && (
              <div id="confirm-dialog-description" className="mt-2 space-y-2">
                {description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                )}
                {warnings.map((warning) => (
                  <p
                    key={warning}
                    className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {loading ? loadingLabel : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
