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
  abortStream: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ abortController: null, streaming: false });
  },
  resetStream: () =>
    set({
      streaming: false,
      streamingContent: "",
      excludedContextCount: 0,
      abortController: null,
    }),
}));
