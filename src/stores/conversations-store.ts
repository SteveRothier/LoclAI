import { create } from "zustand";

type ConversationsRefreshState = {
  version: number;
  bump: () => void;
};

export const useConversationsRefreshStore = create<ConversationsRefreshState>(
  (set, get) => ({
    version: 0,
    bump: () => set({ version: get().version + 1 }),
  })
);
