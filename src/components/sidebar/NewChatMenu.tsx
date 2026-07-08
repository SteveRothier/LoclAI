"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createConversation } from "@/lib/db/schema";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

type NewChatMenuProps = {
  collapsed?: boolean;
  onNavigate: (conversationId: string) => void;
};

export function NewChatMenu({ collapsed, onNavigate }: NewChatMenuProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
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
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const startConversation = async (options?: {
    systemPrompt?: string;
    title?: string;
  }) => {
    setCreating(true);
    try {
      const conv = await createConversation(options);
      setOpen(false);
      onNavigate(conv.id);
    } finally {
      setCreating(false);
    }
  };

  const personas = settings?.personas ?? [];

  if (collapsed) {
    return (
      <Button
        type="button"
        variant="sidebar-ghost"
        size="icon"
        title="Nouvelle conversation"
        disabled={creating}
        onClick={() => void startConversation()}
        className="size-9 shrink-0"
      >
        <MessageSquarePlus className="size-4" />
      </Button>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={creating}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 w-full items-center justify-start gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
          "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <MessageSquarePlus className="size-4" />
        {creating ? "Création…" : "Nouvelle conversation"}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 min-w-[240px] overflow-hidden rounded-xl border border-sidebar-border bg-[#2a2a2a] shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              disabled={creating}
              onClick={() => void startConversation()}
              className="flex w-full items-center px-3 py-2.5 text-left text-sm text-sidebar-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              Conversation vide
            </button>
            {personas.length > 0 && (
              <>
                <div className="border-t border-sidebar-border" />
                <p className="px-3 py-1.5 text-[10px] font-medium tracking-widest text-sidebar-muted uppercase">
                  Assistants
                </p>
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    role="menuitem"
                    disabled={creating}
                    onClick={() =>
                      void startConversation({
                        systemPrompt: persona.systemPrompt,
                        title: persona.name,
                      })
                    }
                    className={cn(
                      "flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/10 disabled:opacity-50",
                      "text-sidebar-foreground"
                    )}
                  >
                    {persona.name}
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
