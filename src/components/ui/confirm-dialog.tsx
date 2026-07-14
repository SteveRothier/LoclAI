"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

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
  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      role="alertdialog"
      labelledBy="confirm-dialog-title"
      describedBy={
        description || warnings.length > 0 ? "confirm-dialog-description" : undefined
      }
      dismissible={!loading}
      panelClassName="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>

        <div className="min-w-0 flex-1">
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
                  className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
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
    </Modal>
  );
}
