"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, MoreVertical, Pencil, Pin, PinOff, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

type ConversationMenuProps = {
  open: boolean;
  pinned: boolean;
  archived?: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  hideRename?: boolean;
  hideDuplicate?: boolean;
  hidePin?: boolean;
};

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10",
        destructive ? "text-red-400" : "text-sidebar-foreground"
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      {label}
    </button>
  );
}

export function ConversationMenu({
  open,
  pinned,
  archived = false,
  onOpenChange,
  onRename,
  onDuplicate,
  onTogglePin,
  onToggleArchive,
  onDelete,
  hideRename,
  hideDuplicate,
  hidePin,
}: ConversationMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.right + 8,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const closeAnd = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <>
      <div
        className={cn(
          "absolute top-1/2 right-1 z-10 -translate-y-1/2 transition-opacity",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label="Options de conversation"
          aria-expanded={open}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenChange(!open);
          }}
          className="flex size-7 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 min-w-[200px] overflow-hidden rounded-xl bg-[#2a2a2a] shadow-xl"
          >
            {!hideRename && (
              <MenuItem
                icon={Pencil}
                label="Renommer"
                onClick={() => closeAnd(onRename)}
              />
            )}
            {!hideDuplicate && (
              <MenuItem
                icon={Copy}
                label="Dupliquer"
                onClick={() => closeAnd(onDuplicate)}
              />
            )}
            {!hidePin && (
              <MenuItem
                icon={pinned ? PinOff : Pin}
                label={pinned ? "Désépingler" : "Épingler"}
                onClick={() => closeAnd(onTogglePin)}
              />
            )}
            <MenuItem
              icon={archived ? ArchiveRestore : Archive}
              label={archived ? "Désarchiver" : "Archiver"}
              onClick={() => closeAnd(onToggleArchive)}
            />
            <div className="my-1 border-t border-sidebar-border" />
            <MenuItem
              icon={Trash2}
              label="Supprimer"
              destructive
              onClick={() => closeAnd(onDelete)}
            />
          </div>,
          document.body
        )}
    </>
  );
}
