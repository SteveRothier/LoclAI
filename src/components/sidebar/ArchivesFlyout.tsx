"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArchiveRestore } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionLoading } from "@/components/ui/loader";
import { ConversationMenu } from "@/components/sidebar/ConversationMenu";
import { useArchivedConversations } from "@/lib/db/hooks";
import {
  deleteConversation,
  toggleConversationArchive,
} from "@/lib/db/schema";
import { useConversationsRefreshStore } from "@/stores/conversations-store";
import { cn } from "@/lib/utils";

const FLYOUT_WIDTH = 280;
const FLYOUT_MAX_HEIGHT = 480;
const FLYOUT_GAP = 4;

type ArchivesFlyoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  sidebarRef: RefObject<HTMLElement | null>;
  activeId: string | null;
};

export function ArchivesFlyout({
  open,
  onOpenChange,
  anchorRef,
  sidebarRef,
  activeId,
}: ArchivesFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { conversations, loading } = useArchivedConversations();

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const maxHeight = Math.min(FLYOUT_MAX_HEIGHT, window.innerHeight - 16);
      let top = rect.top;
      const maxTop = window.innerHeight - maxHeight - 8;
      top = Math.min(Math.max(8, top), maxTop);

      const sidebarRight =
        sidebarRef.current?.getBoundingClientRect().right ?? rect.right;

      setPosition({
        top,
        left: sidebarRight + FLYOUT_GAP,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, sidebarRef]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onOpenChange(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, onOpenChange, anchorRef]);

  const handleRestore = async (id: string) => {
    await toggleConversationArchive(id);
    useConversationsRefreshStore.getState().bump();
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteConversation(deleteTarget.id);
      useConversationsRefreshStore.getState().bump();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !position) return null;

  return createPortal(
    <>
      <div
        ref={panelRef}
        style={{ top: position.top, left: position.left, width: FLYOUT_WIDTH }}
        className={cn(
          "fixed z-50 flex max-h-[min(480px,calc(100vh-1rem))] flex-col overflow-hidden",
          "rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
        )}
      >
        <div className="shrink-0 border-b border-sidebar-border px-4 py-3">
          <p className="text-sm font-semibold text-white">Archives</p>
          <p className="mt-0.5 text-xs text-sidebar-muted">
            Conversations masquées de la barre latérale.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {loading && (
            <div className="px-3 py-4">
              <SectionLoading inline tone="sidebar-muted" className="text-sidebar-muted" />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="px-3 py-8 text-center">
              <ArchiveRestore className="mx-auto size-6 text-sidebar-muted" />
              <p className="mt-2 text-sm text-sidebar-muted">
                Aucune conversation archivée.
              </p>
            </div>
          )}
          {!loading && conversations.length > 0 && (
            <ul className="space-y-0.5">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <div
                    className={cn(
                      "group relative rounded-lg transition-colors",
                      activeId === conv.id ? "bg-sidebar-active" : "hover:bg-sidebar-accent",
                      openMenuId === conv.id && "bg-sidebar-accent"
                    )}
                  >
                    <Link
                      href={`/c/${conv.id}`}
                      title={conv.title}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "block w-full truncate px-3 py-2 text-sm font-medium transition-[padding]",
                        "group-hover:pr-9",
                        openMenuId === conv.id && "pr-9",
                        activeId === conv.id ? "text-white" : "text-sidebar-muted"
                      )}
                    >
                      {conv.title}
                    </Link>
                    <ConversationMenu
                      open={openMenuId === conv.id}
                      pinned={false}
                      archived
                      onOpenChange={(isOpen) => setOpenMenuId(isOpen ? conv.id : null)}
                      onRename={() => {}}
                      onDuplicate={() => {}}
                      onTogglePin={() => {}}
                      onToggleArchive={() => void handleRestore(conv.id)}
                      onDelete={() =>
                        setDeleteTarget({ id: conv.id, title: conv.title })
                      }
                      hideRename
                      hideDuplicate
                      hidePin
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title={
          deleteTarget
            ? `Supprimer « ${deleteTarget.title} » ?`
            : "Supprimer la conversation ?"
        }
        description="Cette action est irréversible. Tous les messages seront perdus."
        confirmLabel="Supprimer"
        loadingLabel="Suppression…"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>,
    document.body
  );
}
