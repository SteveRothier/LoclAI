"use client";

import { useEffect, useRef } from "react";
import {
  Bot,
  Cloud,
  Database,
  Palette,
  Server,
  Wrench,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SettingsContent } from "@/components/settings/SettingsContent";
import {
  SETTINGS_SECTIONS,
  useUIStore,
  type SettingsSection,
} from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<SettingsSection, typeof Palette> = {
  general: Palette,
  ollama: Server,
  assistants: Bot,
  models: Cloud,
  data: Database,
  advanced: Wrench,
};

const NAV_GROUPS: { label: string; sections: SettingsSection[] }[] = [
  { label: "App", sections: ["general"] },
  { label: "IA", sections: ["ollama", "assistants", "models"] },
  { label: "Système", sections: ["data", "advanced"] },
];

const ALL_SECTION_IDS = NAV_GROUPS.flatMap((group) => group.sections);

export function SettingsDialog() {
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const settingsSection = useUIStore((s) => s.settingsSection);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const setSettingsSection = useUIStore((s) => s.setSettingsSection);
  const contentRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [settingsSection]);

  const handleNavKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const currentIndex = ALL_SECTION_IDS.indexOf(settingsSection);
    if (currentIndex === -1) return;

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(currentIndex + 1, ALL_SECTION_IDS.length - 1)
        : Math.max(currentIndex - 1, 0);

    setSettingsSection(ALL_SECTION_IDS[nextIndex]);
  };

  const renderNavButton = (id: SettingsSection) => {
    const section = SETTINGS_SECTIONS.find((s) => s.id === id);
    if (!section) return null;

    const Icon = SECTION_ICONS[id];
    const active = settingsSection === id;
    const tabId = `settings-tab-${id}`;

    return (
      <button
        key={id}
        id={tabId}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls="settings-tabpanel"
        onClick={() => setSettingsSection(id)}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full border-l-0 px-3 py-2 text-left text-sm font-medium transition-colors",
          "md:w-full md:rounded-lg md:border-l-2 md:px-3",
          active
            ? "bg-primary/10 text-foreground md:border-primary"
            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground md:border-transparent"
        )}
      >
        <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
        {section.label}
      </button>
    );
  };

  return (
    <Modal
      open={settingsOpen}
      onOpenChange={(open) => {
        if (!open) closeSettings();
      }}
      labelledBy="settings-dialog-title"
      panelClassName={cn(
        "flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl",
        "h-[95vh] md:h-[min(680px,90vh)] md:flex-row"
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <h2 id="settings-dialog-title" className="text-base font-semibold text-foreground">
          Paramètres
        </h2>
        <button
          type="button"
          onClick={() => closeSettings()}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav
        ref={navRef}
        aria-label="Sections des paramètres"
        className="flex shrink-0 flex-col border-b border-border md:w-52 md:border-b-0 md:border-r"
        onKeyDown={handleNavKeyDown}
      >
        <div className="hidden items-center justify-between px-4 py-4 md:flex">
          <h2 className="text-base font-semibold text-foreground">Paramètres</h2>
          <button
            type="button"
            onClick={() => closeSettings()}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          role="tablist"
          aria-orientation="vertical"
          className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:px-2 md:pb-2"
        >
          {NAV_GROUPS.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn(
                "flex shrink-0 gap-1 md:flex-col md:gap-0.5",
                groupIndex > 0 && "md:mt-3 md:border-t md:border-border md:pt-3"
              )}
            >
              <p className="hidden px-3 pb-1 text-[10px] font-medium tracking-widest text-muted-foreground uppercase md:block">
                {group.label}
              </p>
              <div className="flex gap-1 md:flex-col md:gap-0.5">
                {group.sections.map(renderNavButton)}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={contentRef}
          id="settings-tabpanel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${settingsSection}`}
          className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin"
        >
          <SettingsContent section={settingsSection} />
        </div>
        <div className="hidden shrink-0 border-t border-border px-6 py-3 md:block">
          <p className="text-center text-xs text-muted-foreground">
            LoclAI — configuration locale, rien n&apos;est envoyé au cloud
          </p>
        </div>
      </div>
    </Modal>
  );
}
