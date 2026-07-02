const LIBRARY_API_BASE = "https://ollama-models-api.devcomfort.workers.dev";

export type LibrarySearchResult = {
  modelId: string;
  url: string;
};

export type LibraryModelTags = {
  modelId: string;
  pageUrl: string;
  tags: string[];
  defaultTag: string | null;
};

type SearchApiResponse = {
  pages: { http_url: string; model_id: string }[];
};

type ModelApiResponse = {
  page_url: string;
  id: string;
  tags: string[];
  default_tag: string | null;
};

export async function searchOllamaLibrary(
  query: string,
  signal?: AbortSignal
): Promise<LibrarySearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const response = await fetch(
    `${LIBRARY_API_BASE}/search?q=${encodeURIComponent(q)}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Impossible de rechercher dans la bibliothèque Ollama.");
  }

  const data = (await response.json()) as SearchApiResponse;
  return data.pages.map((page) => ({
    modelId: page.model_id.replace(/^library\//, ""),
    url: page.http_url,
  }));
}

export async function getOllamaLibraryModelTags(
  modelId: string,
  signal?: AbortSignal
): Promise<LibraryModelTags> {
  const name = modelId.includes("/") ? modelId : `library/${modelId}`;
  const response = await fetch(
    `${LIBRARY_API_BASE}/model?name=${encodeURIComponent(name)}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Impossible de charger les variantes du modèle.");
  }

  const data = (await response.json()) as ModelApiResponse;
  return {
    modelId: data.id.replace(/^library\//, ""),
    pageUrl: data.page_url,
    tags: data.tags,
    defaultTag: data.default_tag,
  };
}

export function getMainLibraryTags(tags: string[]): string[] {
  const preferred = tags.filter((tag) => {
    const variant = tag.split(":")[1] ?? "";
    return (
      variant === "latest" ||
      /^\d+(\.\d+)?b$/i.test(variant) ||
      /^\d+b$/i.test(variant)
    );
  });

  const source = preferred.length > 0 ? preferred : tags;
  const unique = new Set<string>();

  for (const tag of source) {
    unique.add(tag);
    if (unique.size >= 8) break;
  }

  return [...unique];
}

export function isModelInstalled(
  pullName: string,
  installedNames: string[]
): boolean {
  if (installedNames.includes(pullName)) return true;
  const base = pullName.split(":")[0];
  return installedNames.some(
    (name) => name === base || name.startsWith(`${base}:`)
  );
}
