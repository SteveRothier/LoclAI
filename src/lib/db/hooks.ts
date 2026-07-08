"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  listConversations,
  listArchivedConversations,
  searchConversations,
  getMessages,
} from "@/lib/db/schema";

export function useConversations(searchQuery = "") {
  const conversations = useLiveQuery(
    () =>
      searchQuery.trim()
        ? searchConversations(searchQuery)
        : listConversations(),
    [searchQuery]
  );

  return {
    conversations: conversations ?? [],
    loading: conversations === undefined,
  };
}

export function useArchivedConversations() {
  const conversations = useLiveQuery(() => listArchivedConversations(), []);

  return {
    conversations: conversations ?? [],
    loading: conversations === undefined,
  };
}

export function useMessages(conversationId: string | null) {
  const messages = useLiveQuery(
    () =>
      conversationId ? getMessages(conversationId) : Promise.resolve([]),
    [conversationId]
  );

  return {
    messages: messages ?? [],
    loading: conversationId !== null && messages === undefined,
  };
}
