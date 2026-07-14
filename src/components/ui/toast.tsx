"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useToastStore } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg",
            "border-border bg-card text-foreground",
            toast.type === "success" && "border-primary/30",
            toast.type === "error" && "border-destructive/30"
          )}
        >
          <p className="min-w-0 flex-1 leading-relaxed">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
