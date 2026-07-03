import { create } from "zustand";

const STORAGE_KEY = "loclai-sidebar-open";

type UIState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

function saveSidebarOpen(open: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
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
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    useUIStore.setState({ sidebarOpen: stored === "1" });
  }
}
