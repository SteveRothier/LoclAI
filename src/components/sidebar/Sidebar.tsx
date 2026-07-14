"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeft,
  PanelLeftClose,
  Search,
  Settings,
  MessageSquare,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SectionLoading } from "@/components/ui/loader";
import { ConversationMenu } from "@/components/sidebar/ConversationMenu";
import { NewChatMenu } from "@/components/sidebar/NewChatMenu";
import { ArchivesFlyout } from "@/components/sidebar/ArchivesFlyout";
import { SidebarFlyout } from "@/components/sidebar/SidebarFlyout";
import { useConversations } from "@/lib/db/hooks";
import {
  deleteConversation,
  forkConversation,
  toggleConversationPin,
  toggleConversationArchive,
  updateConversation,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useConversationsRefreshStore } from "@/stores/conversations-store";
import { useUIStore } from "@/stores/ui-store";

function SidebarIconButton({
  title,
  onClick,
  children,
  active,
  buttonRef,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-colors outline-none",
        "text-sidebar-muted hover:bg-sidebar-accent hover:text-white",
        active && "bg-sidebar-active text-primary"
      )}
    >
      {children}
    </button>
  );
}

type DeleteTarget = {
  id: string;
  title: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutSearchFocus, setFlyoutSearchFocus] = useState(false);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const archivesTriggerRef = useRef<HTMLButtonElement>(null);
  const archivesCollapsedTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const { conversations, loading } = useConversations(search);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);
  const archivesFlyoutOpen = useUIStore((s) => s.archivesFlyoutOpen);
  const setArchivesFlyoutOpen = useUIStore((s) => s.setArchivesFlyoutOpen);

  const activeId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null;

  const isSearching = search.trim().length > 0;
  const pinnedConversations = isSearching
    ? []
    : conversations.filter((conv) => conv.pinned);
  const recentConversations = isSearching
    ? conversations
    : conversations.filter((conv) => !conv.pinned);

  const flyoutAnchorRef = flyoutSearchFocus ? searchTriggerRef : historyTriggerRef;
  const archivesAnchorRef = sidebarOpen ? archivesTriggerRef : archivesCollapsedTriggerRef;

  const handleToggleArchive = async (id: string) => {
    await toggleConversationArchive(id);
    useConversationsRefreshStore.getState().bump();
    setOpenMenuId(null);
    if (activeId === id) {
      router.push("/");
    }
  };

  const openDeleteDialog = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { id } = deleteTarget;
      await deleteConversation(id);
      useConversationsRefreshStore.getState().bump();
      if (activeId === id) {
        router.push("/");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleFork = async (id: string) => {
    const forked = await forkConversation(id);
    useConversationsRefreshStore.getState().bump();
    router.push(`/c/${forked.id}`);
  };

  const handleTogglePin = async (id: string) => {
    await toggleConversationPin(id);
    useConversationsRefreshStore.getState().bump();
    setOpenMenuId(null);
  };

  const startRename = (id: string, title: string) => {
    setOpenMenuId(null);
    setEditingId(id);
    setEditTitle(title);
  };

  const commitRename = async (id: string) => {
    const title = editTitle.trim();
    if (title) {
      await updateConversation(id, { title, titleAuto: false });
      useConversationsRefreshStore.getState().bump();
    }
    setEditingId(null);
  };

  const openSearchFlyout = () => {
    setArchivesFlyoutOpen(false);
    setFlyoutSearchFocus(true);
    setFlyoutOpen(true);
  };

  const toggleHistoryFlyout = () => {
    if (flyoutOpen && !flyoutSearchFocus) {
      closeFlyout();
      return;
    }
    setArchivesFlyoutOpen(false);
    setFlyoutSearchFocus(false);
    setFlyoutOpen(true);
  };

  const toggleArchivesFlyout = () => {
    if (archivesFlyoutOpen) {
      setArchivesFlyoutOpen(false);
      return;
    }
    closeFlyout();
    setArchivesFlyoutOpen(true);
  };

  const handleOpenSettings = () => {
    closeFlyout();
    setArchivesFlyoutOpen(false);
    openSettings();
  };

  const closeFlyout = () => {
    setFlyoutOpen(false);
    setFlyoutSearchFocus(false);
  };

  const renderConversation = (conv: (typeof conversations)[number]) => (
    <li key={conv.id}>
      {editingId === conv.id ? (
        <Input
          variant="sidebar"
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => void commitRename(conv.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitRename(conv.id);
            if (e.key === "Escape") setEditingId(null);
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
            onOpenChange={(open) => setOpenMenuId(open ? conv.id : null)}
            onRename={() => startRename(conv.id, conv.title)}
            onDuplicate={() => void handleFork(conv.id)}
            onTogglePin={() => void handleTogglePin(conv.id)}
            onToggleArchive={() => void handleToggleArchive(conv.id)}
            onDelete={() => openDeleteDialog(conv.id, conv.title)}
          />
        </div>
      )}
    </li>
  );

  const flyoutProps = {
    open: flyoutOpen,
    onOpenChange: (open: boolean) => {
      if (open) setFlyoutOpen(true);
      else closeFlyout();
    },
    anchorRef: flyoutAnchorRef,
    sidebarRef,
    search,
    onSearchChange: setSearch,
    searchAutoFocus: flyoutSearchFocus,
    loading,
    conversations,
    pinnedConversations,
    recentConversations,
    activeId,
    isSearching,
    editingId,
    editTitle,
    openMenuId,
    onEditTitleChange: setEditTitle,
    onCommitRename: (id: string) => void commitRename(id),
    onCancelRename: () => setEditingId(null),
    onMenuOpenChange: setOpenMenuId,
    onRename: startRename,
    onDuplicate: (id: string) => void handleFork(id),
    onTogglePin: (id: string) => void handleTogglePin(id),
    onToggleArchive: (id: string) => void handleToggleArchive(id),
    onDelete: openDeleteDialog,
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className="relative h-full w-full overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        suppressHydrationWarning
      >
        {/* Panneau étendu — fondu + rognage pendant la fermeture */}
        <div
          className={cn(
            "absolute inset-0 flex w-[260px] flex-col transition-opacity duration-300 ease-in-out",
            sidebarOpen
              ? "pointer-events-auto z-10 opacity-100"
              : "pointer-events-none z-0 opacity-0"
          )}
        >
          <div className="flex shrink-0 items-center justify-between px-5 py-5">
            <p className="text-lg font-semibold tracking-tight text-white">LoclAI</p>
            <Button
              type="button"
              variant="sidebar-ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(false)}
              title="Réduire le panneau"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>

          <div className="shrink-0 space-y-3 px-3">
            <NewChatMenu onNavigate={(id) => router.push(`/c/${id}`)} />
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-sidebar-muted" />
              <Input
                ref={searchRef}
                variant="sidebar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="pl-9"
              />
            </div>
          </div>

          {pinnedConversations.length > 0 && (
            <div className="mt-4 px-5">
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

          <div className="mt-4 px-5">
            <p className="text-[10px] font-medium tracking-widest text-sidebar-muted uppercase">
              {isSearching ? "Résultats" : "Récents"}
            </p>
          </div>

          <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
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

          <div className="shrink-0 space-y-3 border-t border-sidebar-border p-3">
            <button
              ref={archivesTriggerRef}
              type="button"
              onClick={toggleArchivesFlyout}
              className={cn(
                "inline-flex h-9 w-full items-center justify-start gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                archivesFlyoutOpen
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Archive className="size-4" />
              Archives
            </button>
            <button
              type="button"
              onClick={handleOpenSettings}
              className={cn(
                "inline-flex h-9 w-full items-center justify-start gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                settingsOpen
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Settings className="size-4" />
              Paramètres
            </button>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                L
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">Local</p>
                <p className="truncate text-xs text-sidebar-muted">IA hors ligne</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rail replié — fondu symétrique avec le panneau étendu */}
        <div
          className={cn(
            "absolute inset-0 flex w-[52px] flex-col items-center py-3 transition-opacity duration-300 ease-in-out",
            sidebarOpen
              ? "pointer-events-none z-0 opacity-0"
              : "pointer-events-auto z-10 opacity-100"
          )}
        >
          <SidebarIconButton
            title="Ouvrir le panneau"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4" />
          </SidebarIconButton>

          <div className="mt-2 flex flex-col items-center gap-1">
            <NewChatMenu
              collapsed
              onNavigate={(id) => router.push(`/c/${id}`)}
            />
            <SidebarIconButton
              title="Rechercher"
              buttonRef={searchTriggerRef}
              onClick={openSearchFlyout}
            >
              <Search className="size-4" />
            </SidebarIconButton>
          </div>

          <div className="mt-2 flex flex-1 flex-col items-center justify-start pt-1">
            <SidebarIconButton
              title="Historique des conversations"
              buttonRef={historyTriggerRef}
              active={flyoutOpen || !!activeId}
              onClick={toggleHistoryFlyout}
            >
              <MessageSquare className="size-4" />
            </SidebarIconButton>
          </div>

          <div className="mt-2 flex flex-col items-center gap-2 border-t border-sidebar-border pt-3">
            <SidebarIconButton
              title="Archives"
              buttonRef={archivesCollapsedTriggerRef}
              active={archivesFlyoutOpen}
              onClick={toggleArchivesFlyout}
            >
              <Archive className="size-4" />
            </SidebarIconButton>
            <SidebarIconButton
              title="Paramètres"
              active={settingsOpen}
              onClick={handleOpenSettings}
            >
              <Settings className="size-4" />
            </SidebarIconButton>
            <div
              title="Local — IA hors ligne"
              className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              L
            </div>
          </div>
        </div>
      </aside>

      {!sidebarOpen && <SidebarFlyout {...flyoutProps} />}

      <ArchivesFlyout
        open={archivesFlyoutOpen}
        onOpenChange={setArchivesFlyoutOpen}
        anchorRef={archivesAnchorRef}
        sidebarRef={sidebarRef}
        activeId={activeId}
      />
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
    </>
  );
}
