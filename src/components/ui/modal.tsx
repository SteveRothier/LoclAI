"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1
  );
}

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  describedBy?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  dismissible?: boolean;
  panelRef?: RefObject<HTMLDivElement | null>;
};

export function Modal({
  open,
  onOpenChange,
  children,
  className,
  panelClassName,
  role = "dialog",
  labelledBy,
  describedBy,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = false,
  dismissible = true,
  panelRef: externalPanelRef,
}: ModalProps) {
  const internalPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? internalPanelRef;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = getFocusableElements(panel);
      (focusable[0] ?? panel).focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && dismissible && event.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [open, closeOnEscape, dismissible, onOpenChange, panelRef]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className
      )}
      role="presentation"
      onMouseDown={(event) => {
        if (!closeOnBackdrop || !dismissible) return;
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />

      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn(
          "relative outline-none",
          panelClassName
        )}
      >
        {showCloseButton && dismissible && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
