import { fetchChatOnce } from "@/lib/ollama/client";

const TITLE_SYSTEM_PROMPT =
  "Génère un titre court (3 à 6 mots max) pour cette conversation. Réponds uniquement avec le titre, sans guillemets ni ponctuation finale. Langue : français.";

const MAX_TITLE_LENGTH = 60;

export function fallbackTitleFromMessage(userMessage: string): string {
  const title = userMessage.trim().slice(0, MAX_TITLE_LENGTH) || "Nouvelle conversation";
  return title.length >= MAX_TITLE_LENGTH ? `${title}…` : title;
}

export function sanitizeGeneratedTitle(raw: string, fallback: string): string {
  let title = raw.trim();

  if (
    (title.startsWith('"') && title.endsWith('"')) ||
    (title.startsWith("«") && title.endsWith("»")) ||
    (title.startsWith("'") && title.endsWith("'"))
  ) {
    title = title.slice(1, -1).trim();
  }

  title = title.replace(/[.!?…]+$/u, "").trim();

  if (!title) return fallback;

  if (title.length > MAX_TITLE_LENGTH) {
    return `${title.slice(0, MAX_TITLE_LENGTH)}…`;
  }

  return title;
}

export async function generateConversationTitle(
  baseUrl: string,
  model: string,
  userMessage: string,
  assistantMessage?: string
): Promise<string> {
  const fallback = fallbackTitleFromMessage(userMessage);
  const user = userMessage.trim();
  if (!user) return fallback;

  const contextParts = [`Utilisateur : ${user}`];
  const assistant = assistantMessage?.trim();
  if (assistant) {
    contextParts.push(`Assistant : ${assistant.slice(0, 500)}`);
  }

  try {
    const content = await fetchChatOnce({
      baseUrl,
      model,
      messages: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: contextParts.join("\n\n") },
      ],
    });

    return sanitizeGeneratedTitle(content, fallback);
  } catch {
    return fallback;
  }
}
