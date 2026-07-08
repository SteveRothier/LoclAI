import { create } from "zustand";

const STORAGE_KEY = "loclai-sidebar-open";
export const SIDEBAR_TRANSITION_MS = 300;

type UIState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
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
  // Valeur fixe pour l'hydratation SSR ; initUIStore() synchronise avant le paint.
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
}));

export function initUIStore() {
  if (typeof window === "undefined") return;
  const open = getInitialSidebarOpen();
  applySidebarAttribute(open);
  useUIStore.setState({ sidebarOpen: open });
}
