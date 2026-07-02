"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MessageSquarePlus,
  Search,
  Settings,
  Trash2,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OllamaStatusBadge } from "@/components/ollama/OllamaStatusBadge";
import { useConversations } from "@/lib/db/hooks";
import {
  createConversation,
  deleteConversation,
  updateConversation,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { conversations, loading } = useConversations(search);

  const activeId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null;

  const handleNewChat = async () => {
    const conv = await createConversation();
    router.push(`/c/${conv.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer cette conversation ?")) return;
    await deleteConversation(id);
    if (activeId === id) {
      router.push("/");
    }
  };

  const startRename = (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const commitRename = async (id: string) => {
    const title = editTitle.trim();
    if (title) {
      await updateConversation(id, { title });
    }
    setEditingId(null);
  };

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5">
        <p className="text-lg font-semibold tracking-tight text-white">
          LoclAI
        </p>
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
          Conversations
        </p>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {loading && (
          <p className="px-3 py-4 text-sm text-sidebar-muted">Chargement…</p>
        )}
        {!loading && conversations.length === 0 && (
          <p className="px-3 py-4 text-sm text-sidebar-muted">
            Aucune conversation
          </p>
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
                <Link
                  href={`/c/${conv.id}`}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeId === conv.id
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <MessageSquare
                    className={cn(
                      "size-4 shrink-0",
                      activeId === conv.id ? "text-primary" : "text-sidebar-muted"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="truncate text-xs text-sidebar-muted">
                      {formatDistanceToNow(conv.updatedAt, {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="sidebar-ghost"
                      size="icon-sm"
                      onClick={(e) => startRename(conv.id, conv.title, e)}
                      title="Renommer"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="sidebar-ghost"
                      size="icon-sm"
                      onClick={(e) => void handleDelete(conv.id, e)}
                      title="Supprimer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <OllamaStatusBadge />
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
  );
}
