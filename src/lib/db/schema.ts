import Dexie, { type EntityTable } from "dexie";

export type MessageMetrics = {
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
};

export type Persona = {
  id: string;
  name: string;
  systemPrompt: string;
};

export type Conversation = {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  titleAuto: boolean;
  pinned: boolean;
  pinnedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  metrics?: MessageMetrics;
};

export type AppSettings = {
  id: "settings";
  ollamaUrl: string;
  defaultModel: string;
  defaultSystemPrompt: string;
  disabledModels: string[];
  maxContextMessages: number;
  personas: Persona[];
};

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings | null;
};

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: "general",
    name: "Assistant général",
    systemPrompt:
      "Tu es un assistant IA utile, précis et concis. Réponds en français sauf demande contraire.",
  },
  {
    id: "developer",
    name: "Développeur",
    systemPrompt:
      "Tu es un développeur senior. Donne du code propre, explique brièvement, et propose des bonnes pratiques.",
  },
  {
    id: "writer",
    name: "Rédacteur",
    systemPrompt:
      "Tu es un rédacteur professionnel. Améliore la clarté, le ton et la structure des textes en français.",
  },
  {
    id: "analyst",
    name: "Analyste",
    systemPrompt:
      "Tu es un analyste rigoureux. Structure tes réponses, cite les hypothèses et reste factuel.",
  },
];

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
    this.version(2).stores({
      conversations: "id, updatedAt, createdAt, title, pinned, pinnedAt",
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
  defaultSystemPrompt: DEFAULT_PERSONAS[0].systemPrompt,
  disabledModels: [],
  maxContextMessages: 40,
  personas: DEFAULT_PERSONAS,
};

function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    titleAuto: conversation.titleAuto ?? true,
    pinned: conversation.pinned ?? false,
  };
}

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings");
  return {
    ...DEFAULT_SETTINGS,
    ...existing,
    disabledModels: existing?.disabledModels ?? [],
    maxContextMessages: existing?.maxContextMessages ?? DEFAULT_SETTINGS.maxContextMessages,
    personas:
      existing?.personas && existing.personas.length > 0
        ? existing.personas
        : DEFAULT_SETTINGS.personas,
  };
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
    titleAuto: partial?.titleAuto ?? true,
    pinned: partial?.pinned ?? false,
    pinnedAt: partial?.pinnedAt,
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
  const conversation = await db.conversations.get(id);
  if (!conversation) return undefined;
  return normalizeConversation(conversation);
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    const aPinned = a.pinned ?? false;
    const bPinned = b.pinned ?? false;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    if (aPinned && bPinned) {
      return (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0);
    }
    return b.updatedAt - a.updatedAt;
  });
}

export async function listConversations(): Promise<Conversation[]> {
  const all = await db.conversations.toArray();
  return sortConversations(all.map(normalizeConversation));
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
  content: string,
  metrics?: MessageMetrics
): Promise<Message> {
  const message: Message = {
    id: crypto.randomUUID(),
    conversationId,
    role,
    content,
    createdAt: Date.now(),
    metrics,
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

export async function toggleConversationPin(id: string): Promise<void> {
  const conversation = await getConversation(id);
  if (!conversation) return;

  const pinned = !conversation.pinned;
  await updateConversation(id, {
    pinned,
    pinnedAt: pinned ? Date.now() : undefined,
  });
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
    conversations: conversations.map(normalizeConversation),
    messages,
    settings,
  };
}

export async function importAllData(payload: ExportPayload): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, db.settings, async () => {
    await db.conversations.clear();
    await db.messages.clear();
    await db.settings.clear();
    if (payload.conversations.length) {
      await db.conversations.bulkAdd(payload.conversations.map(normalizeConversation));
    }
    if (payload.messages.length) await db.messages.bulkAdd(payload.messages);
    if (payload.settings) await db.settings.put(payload.settings);
  });
}

export async function getLastConversation(): Promise<Conversation | undefined> {
  const list = await listConversations();
  return list[0];
}

export async function forkConversation(id: string): Promise<Conversation> {
  const source = await getConversation(id);
  if (!source) throw new Error("Conversation introuvable");

  const messages = await getMessages(id);
  const now = Date.now();
  const newId = crypto.randomUUID();

  const conversation: Conversation = {
    id: newId,
    title: `${source.title} (copie)`,
    model: source.model,
    systemPrompt: source.systemPrompt,
    titleAuto: false,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  const copiedMessages: Message[] = messages.map((message) => ({
    id: crypto.randomUUID(),
    conversationId: newId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    metrics: message.metrics,
  }));

  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.conversations.add(conversation);
    if (copiedMessages.length > 0) {
      await db.messages.bulkAdd(copiedMessages);
    }
  });

  return conversation;
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
