"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArchiveRestore } from "lucide-react";
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

export default function ArchivesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, loading } = useArchivedConversations();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]?.split("/")[0]
    : null;

  const handleRestore = async (id: string) => {
    await toggleConversationArchive(id);
    useConversationsRefreshStore.getState().bump();
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { id } = deleteTarget;
      await deleteConversation(id);
      useConversationsRefreshStore.getState().bump();
      if (activeId === id) {
        router.push("/archives");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="border-b border-border px-8 py-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Link
            href="/"
            className="inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Archives</h1>
            <p className="text-sm text-muted-foreground">
              Conversations masquées de la barre latérale — restaurez-les à tout moment.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl">
          {loading && <SectionLoading />}
          {!loading && conversations.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <ArchiveRestore className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune conversation archivée.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                Retour aux conversations
              </Link>
            </div>
          )}
          {!loading && conversations.length > 0 && (
            <ul className="space-y-1">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <div
                    className={cn(
                      "group relative rounded-lg border border-border transition-colors hover:bg-muted/50",
                      openMenuId === conv.id && "bg-muted/50"
                    )}
                  >
                    <Link
                      href={`/c/${conv.id}`}
                      className={cn(
                        "block truncate px-4 py-3 pr-10 text-sm font-medium text-foreground"
                      )}
                    >
                      {conv.title}
                    </Link>
                    <ConversationMenu
                      open={openMenuId === conv.id}
                      pinned={false}
                      archived
                      onOpenChange={(open) => setOpenMenuId(open ? conv.id : null)}
                      onRename={() => {}}
                      onDuplicate={() => {}}
                      onTogglePin={() => {}}
                      onToggleArchive={() => void handleRestore(conv.id)}
                      onDelete={() => setDeleteTarget({ id: conv.id, title: conv.title })}
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
    </div>
  );
}
