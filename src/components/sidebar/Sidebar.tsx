"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  Search,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { ConversationMenu } from "@/components/sidebar/ConversationMenu";
import { useConversations } from "@/lib/db/hooks";
import {
  createConversation,
  deleteConversation,
  forkConversation,
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
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="sidebar-ghost"
      size="icon"
      onClick={onClick}
      title={title}
      className={cn("size-9 shrink-0", active && "bg-sidebar-active text-white")}
    >
      {children}
    </Button>
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
  const { conversations, loading } = useConversations(search);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const activeId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null;

  const handleNewChat = async () => {
    const conv = await createConversation();
    router.push(`/c/${conv.id}`);
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

  const focusSearch = () => {
    if (!sidebarOpen) setSidebarOpen(true);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => searchRef.current?.focus(), 220);
    });
  };

  if (!sidebarOpen) {
    return (
      <aside className="flex h-full w-full flex-col items-center border-r border-sidebar-border bg-sidebar py-3">
        <SidebarIconButton
          title="Ouvrir le panneau"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeft className="size-4" />
        </SidebarIconButton>

        <div className="mt-2 flex flex-col items-center gap-1">
          <SidebarIconButton
            title="Nouvelle conversation"
            onClick={() => void handleNewChat()}
          >
            <MessageSquarePlus className="size-4" />
          </SidebarIconButton>
          <SidebarIconButton title="Rechercher" onClick={focusSearch}>
            <Search className="size-4" />
          </SidebarIconButton>
        </div>

        <div className="mt-2 flex flex-1 flex-col items-center gap-1 overflow-y-auto px-1 scrollbar-thin">
          {conversations.slice(0, 8).map((conv) => (
            <Link
              key={conv.id}
              href={`/c/${conv.id}`}
              title={conv.title}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                activeId === conv.id
                  ? "bg-sidebar-active text-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <MessageSquare className="size-4" />
            </Link>
          ))}
        </div>

        <div className="mt-2 flex flex-col items-center gap-2 border-t border-sidebar-border pt-3">
          <Link
            href="/settings"
            title="Paramètres"
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-colors",
              pathname === "/settings"
                ? "bg-sidebar-active text-white"
                : "text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
            )}
          >
            <Settings className="size-4" />
          </Link>
          <div
            title="Local — IA hors ligne"
            className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            L
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center justify-between px-5 py-5">
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

        <div className="space-y-3 px-3">
          <Button
            type="button"
            variant="sidebar"
            className="w-full justify-start gap-2.5"
            onClick={() => void handleNewChat()}
          >
            <MessageSquarePlus className="size-4" />
            Nouvelle conversation
          </Button>
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

        <div className="mt-4 px-5">
          <p className="text-[10px] font-medium tracking-widest text-sidebar-muted uppercase">
            Récents
          </p>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
          {loading && (
            <p className="px-3 py-4 text-sm text-sidebar-muted">Chargement…</p>
          )}
          {!loading && conversations.length === 0 && (
            <p className="px-3 py-4 text-sm text-sidebar-muted">Aucune conversation</p>
          )}
          <ul className="space-y-0.5">
            {conversations.map((conv) => (
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
                      activeId === conv.id
                        ? "bg-sidebar-active"
                        : "hover:bg-sidebar-accent",
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
                        activeId === conv.id
                          ? "text-white"
                          : "text-sidebar-muted"
                      )}
                    >
                      {conv.title}
                    </Link>
                    <ConversationMenu
                      open={openMenuId === conv.id}
                      onOpenChange={(open) => setOpenMenuId(open ? conv.id : null)}
                      onRename={() => startRename(conv.id, conv.title)}
                      onDuplicate={() => void handleFork(conv.id)}
                      onDelete={() => openDeleteDialog(conv.id, conv.title)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 border-t border-sidebar-border p-3">
          <Link
            href="/settings"
            className={cn(
              "inline-flex h-9 w-full items-center justify-start gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-sidebar-active text-white"
                : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="size-4" />
            Paramètres
          </Link>
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
      </aside>

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
