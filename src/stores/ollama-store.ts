import { create } from "zustand";
import { healthCheck, type OllamaModel } from "@/lib/ollama/client";
import { getSettings } from "@/lib/db/schema";

type OllamaState = {
  online: boolean;
  models: OllamaModel[];
  endpointUrl: string;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<boolean>;
  setEndpointUrl: (url: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
};

let pollingId: number | null = null;

export const useOllamaStore = create<OllamaState>((set, get) => ({
  online: false,
  models: [],
  endpointUrl: "http://127.0.0.1:11434",
  error: null,
  initialized: false,
  init: async () => {
    const settings = await getSettings();
    set({ endpointUrl: settings.ollamaUrl, initialized: true });
    await get().refresh();
  },
  refresh: async () => {
    const { endpointUrl } = get();
    const status = await healthCheck(endpointUrl);
    set({
      online: status.online,
      models: status.models,
      error: status.error ?? null,
    });
    return status.online;
  },
  setEndpointUrl: (url) => set({ endpointUrl: url }),
  startPolling: () => {
    if (pollingId !== null) return;
    pollingId = window.setInterval(() => {
      void get().refresh();
    }, 30_000);
  },
  stopPolling: () => {
    if (pollingId === null) return;
    window.clearInterval(pollingId);
    pollingId = null;
  },
}));
