"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SectionLoading } from "@/components/ui/loader";
import { ConversationMenu } from "@/components/sidebar/ConversationMenu";
import type { Conversation } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const FLYOUT_WIDTH = 280;
const FLYOUT_MAX_HEIGHT = 480;
const FLYOUT_GAP = 4;

type SidebarFlyoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  sidebarRef: RefObject<HTMLElement | null>;
  search: string;
  onSearchChange: (value: string) => void;
  searchAutoFocus?: boolean;
  loading: boolean;
  conversations: Conversation[];
  pinnedConversations: Conversation[];
  recentConversations: Conversation[];
  activeId: string | null;
  isSearching: boolean;
  editingId: string | null;
  editTitle: string;
  openMenuId: string | null;
  onEditTitleChange: (value: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onMenuOpenChange: (id: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onNavigate?: () => void;
};

export function SidebarFlyout({
  open,
  onOpenChange,
  anchorRef,
  sidebarRef,
  search,
  onSearchChange,
  searchAutoFocus,
  loading,
  conversations,
  pinnedConversations,
  recentConversations,
  activeId,
  isSearching,
  editingId,
  editTitle,
  openMenuId,
  onEditTitleChange,
  onCommitRename,
  onCancelRename,
  onMenuOpenChange,
  onRename,
  onDuplicate,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onNavigate,
}: SidebarFlyoutProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const maxHeight = Math.min(
        FLYOUT_MAX_HEIGHT,
        window.innerHeight - 16
      );
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
    if (!open || !searchAutoFocus) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, searchAutoFocus]);

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

  const renderConversation = (conv: Conversation) => (
    <li key={conv.id}>
      {editingId === conv.id ? (
        <Input
          variant="sidebar"
          autoFocus
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onBlur={() => void onCommitRename(conv.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onCommitRename(conv.id);
            if (e.key === "Escape") onCancelRename();
          }}
          className="mx-1 h-8"
        />
      ) : (
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
            onClick={() => {
              onOpenChange(false);
              onNavigate?.();
            }}
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
            pinned={conv.pinned}
            onOpenChange={(isOpen) => onMenuOpenChange(isOpen ? conv.id : null)}
            onRename={() => onRename(conv.id, conv.title)}
            onDuplicate={() => onDuplicate(conv.id)}
            onTogglePin={() => onTogglePin(conv.id)}
            onToggleArchive={() => onToggleArchive(conv.id)}
            onDelete={() => onDelete(conv.id, conv.title)}
          />
        </div>
      )}
    </li>
  );

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ top: position.top, left: position.left, width: FLYOUT_WIDTH }}
      className={cn(
        "fixed z-50 flex max-h-[min(480px,calc(100vh-1rem))] flex-col overflow-hidden",
        "rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
      )}
    >
      <div className="shrink-0 space-y-3 border-b border-sidebar-border p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-sidebar-muted" />
          <Input
            ref={searchRef}
            variant="sidebar"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {pinnedConversations.length > 0 && (
          <div className="mt-3 px-4">
            <p className="text-[10px] font-medium tracking-widest text-sidebar-muted uppercase">
              Épinglées
            </p>
          </div>
        )}

        {pinnedConversations.length > 0 && (
          <div className="mt-2 px-2">
            <ul className="space-y-0.5">{pinnedConversations.map(renderConversation)}</ul>
          </div>
        )}

        <div className="mt-3 px-4">
          <p className="text-[10px] font-medium tracking-widest text-sidebar-muted uppercase">
            {isSearching ? "Résultats" : "Récents"}
          </p>
        </div>

        <div className="mt-2 px-2 pb-3">
          {loading && (
            <div className="px-3 py-4">
              <SectionLoading
                inline
                tone="sidebar-muted"
                className="text-sidebar-muted"
              />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <p className="px-3 py-4 text-sm text-sidebar-muted">Aucune conversation</p>
          )}
          <ul className="space-y-0.5">{recentConversations.map(renderConversation)}</ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
