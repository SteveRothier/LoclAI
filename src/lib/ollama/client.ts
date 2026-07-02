import { effectiveOllamaEndpoint } from "@/lib/ollama/config";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OllamaModel = {
  name: string;
  size: number;
  modified_at: string;
};

export type OllamaHealthStatus = {
  online: boolean;
  models: OllamaModel[];
  error?: string;
};

export type ChatStreamOptions = {
  baseUrl: string;
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  signal?: AbortSignal;
  onToken: (content: string) => void;
};

export type ChatStreamResult = {
  content: string;
  aborted: boolean;
};

export async function healthCheck(baseUrl: string): Promise<OllamaHealthStatus> {
  const url = effectiveOllamaEndpoint(baseUrl);

  try {
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        online: false,
        models: [],
        error: `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as { models?: OllamaModel[] };
    return {
      online: true,
      models: data.models ?? [],
    };
  } catch (error) {
    return {
      online: false,
      models: [],
      error: error instanceof Error ? error.message : "Connexion impossible",
    };
  }
}

export async function listModels(baseUrl: string): Promise<OllamaModel[]> {
  const status = await healthCheck(baseUrl);
  return status.models;
}

export async function fetchChatStream({
  baseUrl,
  model,
  messages,
  temperature = 0.7,
  signal,
  onToken,
}: ChatStreamOptions): Promise<ChatStreamResult> {
  const url = effectiveOllamaEndpoint(baseUrl);
  let content = "";

  const response = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama a répondu avec HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Flux de réponse vide");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk = JSON.parse(trimmed) as {
            message?: { content?: string };
            done?: boolean;
          };
          const token = chunk.message?.content ?? "";
          if (token) {
            content += token;
            onToken(content);
          }
        } catch {
          // ignore malformed partial lines
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      return { content, aborted: true };
    }
    throw error;
  }

  return { content, aborted: false };
}
