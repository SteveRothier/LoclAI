import { create } from "zustand";
import {
  deleteModel as deleteOllamaModel,
  healthCheck,
  pullModel,
  type OllamaModel,
  type PullProgress,
} from "@/lib/ollama/client";
import { getSettings } from "@/lib/db/schema";

type OllamaState = {
  online: boolean;
  models: OllamaModel[];
  endpointUrl: string;
  error: string | null;
  initialized: boolean;
  refreshing: boolean;
  pulling: boolean;
  pullModelName: string | null;
  pullProgress: PullProgress | null;
  deleting: string | null;
  init: () => Promise<void>;
  refresh: () => Promise<boolean>;
  setEndpointUrl: (url: string) => void;
  pullModelByName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  deleteModelByName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  startPolling: () => void;
  stopPolling: () => void;
};

let pollingId: number | null = null;
let pullAbortController: AbortController | null = null;

export const useOllamaStore = create<OllamaState>((set, get) => ({
  online: false,
  models: [],
  endpointUrl: "http://127.0.0.1:11434",
  error: null,
  initialized: false,
  refreshing: false,
  pulling: false,
  pullModelName: null,
  pullProgress: null,
  deleting: null,
  init: async () => {
    const settings = await getSettings();
    set({ endpointUrl: settings.ollamaUrl, initialized: true });
    await get().refresh();
  },
  refresh: async () => {
    set({ refreshing: true });
    try {
      const { endpointUrl } = get();
      const status = await healthCheck(endpointUrl);
      set({
        online: status.online,
        models: status.models,
        error: status.error ?? null,
      });
      return status.online;
    } finally {
      set({ refreshing: false });
    }
  },
  setEndpointUrl: (url) => set({ endpointUrl: url }),
  pullModelByName: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Nom de modèle requis" };

    const { endpointUrl, online, pulling } = get();
    if (!online) return { ok: false, error: "Ollama est hors ligne" };
    if (pulling) return { ok: false, error: "Un téléchargement est déjà en cours" };

    pullAbortController?.abort();
    pullAbortController = new AbortController();

    set({
      pulling: true,
      pullModelName: trimmed,
      pullProgress: { status: "Démarrage…" },
    });

    try {
      await pullModel(
        endpointUrl,
        trimmed,
        (progress) => set({ pullProgress: progress }),
        pullAbortController.signal
      );
      await get().refresh();
      return { ok: true };
    } catch (error) {
      if (pullAbortController.signal.aborted) {
        return { ok: false, error: "Téléchargement annulé" };
      }
      const message = error instanceof Error ? error.message : "Échec du téléchargement";
      return { ok: false, error: message };
    } finally {
      pullAbortController = null;
      set({ pulling: false, pullModelName: null, pullProgress: null });
    }
  },
  deleteModelByName: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Nom de modèle requis" };

    const { endpointUrl, online, deleting } = get();
    if (!online) return { ok: false, error: "Ollama est hors ligne" };
    if (deleting) return { ok: false, error: "Une suppression est déjà en cours" };

    set({ deleting: trimmed });

    try {
      await deleteOllamaModel(endpointUrl, trimmed);
      await get().refresh();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec de la suppression";
      return { ok: false, error: message };
    } finally {
      set({ deleting: null });
    }
  },
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
