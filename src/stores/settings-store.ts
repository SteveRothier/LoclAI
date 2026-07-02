import { create } from "zustand";
import { getSettings, saveSettings, type AppSettings } from "@/lib/db/schema";
import { useOllamaStore } from "@/stores/ollama-store";

type SettingsState = {
  settings: AppSettings | null;
  loaded: boolean;
  load: () => Promise<void>;
  update: (updates: Partial<Omit<AppSettings, "id">>) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loaded: false,
  load: async () => {
    const settings = await getSettings();
    set({ settings, loaded: true });
    useOllamaStore.getState().setEndpointUrl(settings.ollamaUrl);
  },
  update: async (updates) => {
    const current = get().settings ?? (await getSettings());
    const next = { ...current, ...updates };
    await saveSettings(next);
    set({ settings: next });
    if (updates.ollamaUrl) {
      useOllamaStore.getState().setEndpointUrl(updates.ollamaUrl);
      await useOllamaStore.getState().refresh();
    }
  },
}));
