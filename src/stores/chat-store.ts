import { create } from "zustand";

type ChatState = {
  streaming: boolean;
  streamingContent: string;
  excludedContextCount: number;
  abortController: AbortController | null;
  inputDraft: string;
  setInputDraft: (value: string) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  setExcludedContextCount: (count: number) => void;
  setAbortController: (controller: AbortController | null) => void;
  /** Atomically claim the send lock. Returns false if a request is already in flight. */
  beginRequest: () => boolean;
  abortStream: () => void;
  resetStream: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  streaming: false,
  streamingContent: "",
  excludedContextCount: 0,
  abortController: null,
  inputDraft: "",
  setInputDraft: (value) => set({ inputDraft: value }),
  setStreaming: (streaming) => set({ streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  setExcludedContextCount: (count) => set({ excludedContextCount: count }),
  setAbortController: (controller) => set({ abortController: controller }),
  beginRequest: () => {
    if (get().streaming) return false;
    set({ streaming: true, streamingContent: "" });
    return true;
  },
  abortStream: () => {
    const { abortController } = get();
    abortController?.abort();
    // Keep streaming=true until resetStream() so a second send cannot sneak in.
    set({ abortController: null });
  },
  resetStream: () =>
    set({
      streaming: false,
      streamingContent: "",
      excludedContextCount: 0,
      abortController: null,
    }),
}));
