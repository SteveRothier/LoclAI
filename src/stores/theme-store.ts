import { create } from "zustand";

const STORAGE_KEY = "loclai-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeState = {
  theme: ThemePreference;
  initialized: boolean;
  setTheme: (theme: ThemePreference) => void;
};

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

function updateDom(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function applyPreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  updateDom(resolveTheme(preference));
}

function saveTheme(theme: ThemePreference) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, theme);
  }
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "system",
  initialized: false,
  setTheme: (theme) => {
    saveTheme(theme);
    applyPreference(theme);
    set({ theme });
  },
}));

export function initThemeStore() {
  if (typeof window === "undefined") return;
  const theme = readStoredTheme();
  useThemeStore.setState({ theme, initialized: true });
}

export function enableThemeTransitions() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("theme-ready");
}

let systemListenerAttached = false;

export function subscribeToSystemTheme(): () => void {
  if (typeof window === "undefined") return () => {};

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") {
      applyPreference("system");
    }
  };

  if (!systemListenerAttached) {
    mq.addEventListener("change", handler);
    systemListenerAttached = true;
  }

  return () => {
    mq.removeEventListener("change", handler);
    systemListenerAttached = false;
  };
}
