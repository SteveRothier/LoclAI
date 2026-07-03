import Dexie, { type EntityTable } from "dexie";

export type Conversation = {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

export type AppSettings = {
  id: "settings";
  ollamaUrl: string;
  defaultModel: string;
  defaultSystemPrompt: string;
  disabledModels: string[];
};

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings | null;
};

class LoclAIDB extends Dexie {
  conversations!: EntityTable<Conversation, "id">;
  messages!: EntityTable<Message, "id">;
  settings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("loclai");
    this.version(1).stores({
      conversations: "id, updatedAt, createdAt, title",
      messages: "id, conversationId, createdAt, [conversationId+createdAt]",
      settings: "id",
    });
  }
}

export const db = new LoclAIDB();

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  ollamaUrl: "http://127.0.0.1:11434",
  defaultModel: "qwen3.5:4b",
  defaultSystemPrompt: "Tu es un assistant IA utile, précis et concis. Réponds en français sauf demande contraire.",
  disabledModels: [],
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings");
  return { ...DEFAULT_SETTINGS, ...existing, disabledModels: existing?.disabledModels ?? [] };
}

export async function saveSettings(settings: Omit<AppSettings, "id">): Promise<void> {
  await db.settings.put({ id: "settings", ...settings });
}

export async function createConversation(
  partial?: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>
): Promise<Conversation> {
  const settings = await getSettings();
  const now = Date.now();
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title: partial?.title ?? "Nouvelle conversation",
    model: partial?.model ?? settings.defaultModel,
    systemPrompt: partial?.systemPrompt ?? settings.defaultSystemPrompt,
    createdAt: now,
    updatedAt: now,
  };
  await db.conversations.add(conversation);
  return conversation;
}

export async function updateConversation(
  id: string,
  updates: Partial<Omit<Conversation, "id" | "createdAt">>
): Promise<void> {
  await db.conversations.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.where("conversationId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return db.conversations.get(id);
}

export async function listConversations(): Promise<Conversation[]> {
  return db.conversations.orderBy("updatedAt").reverse().toArray();
}

export async function searchConversations(query: string): Promise<Conversation[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listConversations();
  const all = await listConversations();
  return all.filter((c) => c.title.toLowerCase().includes(q));
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return db.messages
    .where("[conversationId+createdAt]")
    .between([conversationId, Dexie.minKey], [conversationId, Dexie.maxKey])
    .sortBy("createdAt");
}

export async function addMessage(
  conversationId: string,
  role: Message["role"],
  content: string
): Promise<Message> {
  const message: Message = {
    id: crypto.randomUUID(),
    conversationId,
    role,
    content,
    createdAt: Date.now(),
  };
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.add(message);
    await db.conversations.update(conversationId, { updatedAt: Date.now() });
  });
  return message;
}

export async function updateMessage(id: string, content: string): Promise<void> {
  const message = await db.messages.get(id);
  if (!message) return;

  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.update(id, { content });
    await db.conversations.update(message.conversationId, { updatedAt: Date.now() });
  });
}

export async function deleteMessage(id: string): Promise<void> {
  await db.messages.delete(id);
}

export async function deleteMessagesAfter(
  conversationId: string,
  afterCreatedAt: number
): Promise<void> {
  await db.messages
    .where("[conversationId+createdAt]")
    .between([conversationId, afterCreatedAt + 1], [conversationId, Dexie.maxKey])
    .delete();
}

export async function exportAllData(): Promise<ExportPayload> {
  const [conversations, messages, settings] = await Promise.all([
    db.conversations.toArray(),
    db.messages.toArray(),
    getSettings(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations,
    messages,
    settings,
  };
}

export async function importAllData(payload: ExportPayload): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, db.settings, async () => {
    await db.conversations.clear();
    await db.messages.clear();
    await db.settings.clear();
    if (payload.conversations.length) await db.conversations.bulkAdd(payload.conversations);
    if (payload.messages.length) await db.messages.bulkAdd(payload.messages);
    if (payload.settings) await db.settings.put(payload.settings);
  });
}

export async function getLastConversation(): Promise<Conversation | undefined> {
  return db.conversations.orderBy("updatedAt").reverse().first();
}

export async function countConversationsUsingModel(model: string): Promise<number> {
  const all = await db.conversations.toArray();
  return all.filter((c) => c.model === model).length;
}

export async function updateDefaultModelIfNeeded(
  deletedModel: string,
  fallback: string
): Promise<void> {
  const settings = await getSettings();
  if (settings.defaultModel !== deletedModel) return;
  await saveSettings({ ...settings, defaultModel: fallback });
}
