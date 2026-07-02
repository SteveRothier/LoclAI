import type { OllamaModel } from "@/lib/ollama/client";

export function isModelDisabled(
  modelName: string,
  disabledModels: string[] | undefined
): boolean {
  return (disabledModels ?? []).includes(modelName);
}

export function getEnabledModels(
  models: OllamaModel[],
  disabledModels: string[] | undefined
): OllamaModel[] {
  const disabled = new Set(disabledModels ?? []);
  return models.filter((m) => !disabled.has(m.name));
}

export function getEnabledModelNames(
  models: OllamaModel[],
  disabledModels: string[] | undefined
): string[] {
  return getEnabledModels(models, disabledModels).map((m) => m.name);
}
