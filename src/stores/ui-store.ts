import { create } from "zustand";

const STORAGE_KEY = "loclai-sidebar-open";
export const SIDEBAR_TRANSITION_MS = 300;

export type SettingsSection =
  | "general"
  | "ollama"
  | "assistants"
  | "models"
  | "data"
  | "advanced";

export const SETTINGS_SECTIONS: {
  id: SettingsSection;
  label: string;
}[] = [
  { id: "general", label: "Général" },
  { id: "ollama", label: "Ollama" },
  { id: "assistants", label: "Assistants" },
  { id: "models", label: "Modèles" },
  { id: "data", label: "Données" },
  { id: "advanced", label: "Avancé" },
];

export function isSettingsSection(value: string | null): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section.id === value);
}

type UIState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  settingsOpen: boolean;
  settingsSection: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  setSettingsSection: (section: SettingsSection) => void;
  archivesFlyoutOpen: boolean;
  setArchivesFlyoutOpen: (open: boolean) => void;
  toggleArchivesFlyout: () => void;
};

export function readStoredSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true;
  return stored === "1";
}

function applySidebarAttribute(open: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(
    "data-sidebar",
    open ? "open" : "collapsed"
  );
}

function persistSidebarOpen(open: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }
}

function saveSidebarOpen(open: boolean) {
  persistSidebarOpen(open);
  applySidebarAttribute(open);
}

function getInitialSidebarOpen(): boolean {
  if (typeof window === "undefined") return false;
  const fromDom = document.documentElement.getAttribute("data-sidebar");
  if (fromDom === "collapsed") return false;
  if (fromDom === "open") return true;
  return readStoredSidebarOpen();
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => {
    saveSidebarOpen(open);
    set({ sidebarOpen: open });
  },
  toggleSidebar: () => {
    const next = !get().sidebarOpen;
    saveSidebarOpen(next);
    set({ sidebarOpen: next });
  },
  settingsOpen: false,
  settingsSection: "general",
  openSettings: (section = "general") => {
    set({ settingsOpen: true, settingsSection: section, archivesFlyoutOpen: false });
  },
  closeSettings: () => {
    set({ settingsOpen: false });
  },
  setSettingsSection: (section) => {
    set({ settingsSection: section });
  },
  archivesFlyoutOpen: false,
  setArchivesFlyoutOpen: (open) => {
    set({ archivesFlyoutOpen: open });
  },
  toggleArchivesFlyout: () => {
    const next = !get().archivesFlyoutOpen;
    set({ archivesFlyoutOpen: next, settingsOpen: false });
  },
}));

export function initUIStore() {
  if (typeof window === "undefined") return;
  const open = getInitialSidebarOpen();
  applySidebarAttribute(open);
  useUIStore.setState({ sidebarOpen: open });
}
