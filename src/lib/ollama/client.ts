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

export type ConnectionTestResult = {
  ok: boolean;
  tagsOk: boolean;
  chatOk: boolean;
  models: OllamaModel[];
  error?: string;
};

export type ChatStreamOptions = {
  baseUrl: string;
  model: string;
  messages: OllamaMessage[];
  signal?: AbortSignal;
  onToken: (content: string) => void;
};

export type ChatStreamResult = {
  content: string;
  aborted: boolean;
};

export function isModelAvailable(
  model: string,
  models: OllamaModel[]
): boolean {
  if (!model.trim() || models.length === 0) return true;
  return models.some((m) => m.name === model);
}

export function formatModelNotFoundError(
  model: string,
  models: OllamaModel[]
): string {
  const available = models.map((m) => m.name);
  if (available.length > 0) {
    return `Modèle « ${model} » introuvable. Disponibles : ${available.join(", ")}. Exécutez : ollama pull ${model}`;
  }
  return `Modèle « ${model} » introuvable. Exécutez : ollama pull ${model}`;
}

async function parseOllamaErrorResponse(response: Response): Promise<string> {
  let detail = `Ollama a répondu avec HTTP ${response.status}`;

  try {
    const data = (await response.json()) as { error?: string };
    if (!data.error) return detail;

    detail = data.error;

    if (response.status === 404) {
      const match = data.error.match(/model ["']([^"']+)["']/i);
      if (match) {
        return `Modèle « ${match[1]} » introuvable. Exécutez : ollama pull ${match[1]}`;
      }
    }
  } catch {
    // keep HTTP status message
  }

  return detail;
}

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
        error: await parseOllamaErrorResponse(response),
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

export async function testConnection(
  baseUrl: string,
  model: string
): Promise<ConnectionTestResult> {
  const health = await healthCheck(baseUrl);

  if (!health.online) {
    return {
      ok: false,
      tagsOk: false,
      chatOk: false,
      models: [],
      error: health.error ?? "Ollama inaccessible",
    };
  }

  const url = effectiveOllamaEndpoint(baseUrl);
  const trimmedModel = model.trim();

  if (!trimmedModel) {
    return {
      ok: false,
      tagsOk: true,
      chatOk: false,
      models: health.models,
      error: "Aucun modèle configuré pour le test",
    };
  }

  if (!isModelAvailable(trimmedModel, health.models)) {
    return {
      ok: false,
      tagsOk: true,
      chatOk: false,
      models: health.models,
      error: formatModelNotFoundError(trimmedModel, health.models),
    };
  }

  try {
    const response = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: trimmedModel,
        messages: [{ role: "user", content: "ping" }],
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        tagsOk: true,
        chatOk: false,
        models: health.models,
        error: await parseOllamaErrorResponse(response),
      };
    }

    return {
      ok: true,
      tagsOk: true,
      chatOk: true,
      models: health.models,
    };
  } catch (error) {
    return {
      ok: false,
      tagsOk: true,
      chatOk: false,
      models: health.models,
      error: error instanceof Error ? error.message : "Test du chat échoué",
    };
  }
}

export type PullProgress = {
  status: string;
  percent?: number;
};

export function formatModelSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export async function pullModel(
  baseUrl: string,
  model: string,
  onProgress: (progress: PullProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const url = effectiveOllamaEndpoint(baseUrl);
  const trimmed = model.trim();
  if (!trimmed) throw new Error("Nom de modèle requis");

  const response = await fetch(`${url}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: trimmed, stream: true }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseOllamaErrorResponse(response));
  }

  if (!response.body) {
    throw new Error("Flux de téléchargement vide");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        const chunk = JSON.parse(trimmedLine) as {
          status?: string;
          completed?: number;
          total?: number;
          error?: string;
        };

        if (chunk.error) {
          throw new Error(chunk.error);
        }

        const status = chunk.status ?? "Téléchargement…";
        let percent: number | undefined;
        if (
          typeof chunk.completed === "number" &&
          typeof chunk.total === "number" &&
          chunk.total > 0
        ) {
          percent = Math.min(100, Math.round((chunk.completed / chunk.total) * 100));
        }

        onProgress({ status, percent });
      } catch (error) {
        if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
          throw error;
        }
      }
    }
  }
}

export async function deleteModel(baseUrl: string, model: string): Promise<void> {
  const url = effectiveOllamaEndpoint(baseUrl);
  const trimmed = model.trim();
  if (!trimmed) throw new Error("Nom de modèle requis");

  const response = await fetch(`${url}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: trimmed }),
  });

  if (!response.ok) {
    throw new Error(await parseOllamaErrorResponse(response));
  }
}

export async function fetchChatStream({
  baseUrl,
  model,
  messages,
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
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseOllamaErrorResponse(response));
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
