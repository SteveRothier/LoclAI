const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

export type OllamaRuntime = {
  baseUrl: string;
  model: string;
};

export function getDefaultOllamaUrl(): string {
  return process.env.NEXT_PUBLIC_OLLAMA_URL?.trim() || DEFAULT_OLLAMA_URL;
}

export function getDefaultOllamaModel(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
}

export function normalizeOllamaEndpointUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return trimmed.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isLocalOllamaUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function effectiveOllamaEndpoint(endpointUrl: string): string {
  return normalizeOllamaEndpointUrl(endpointUrl) ?? DEFAULT_OLLAMA_URL;
}
