import { describe, expect, it } from "vitest";
import type { OllamaModel } from "@/lib/ollama/client";
import {
  getEnabledModelNames,
  getEnabledModels,
  isModelDisabled,
} from "@/lib/ollama/models";

const models: OllamaModel[] = [
  { name: "qwen3.5:4b", size: 1, modified_at: "" },
  { name: "llama3.2:latest", size: 2, modified_at: "" },
];

describe("isModelDisabled", () => {
  it("returns false when list is empty", () => {
    expect(isModelDisabled("qwen3.5:4b", [])).toBe(false);
  });

  it("returns true when model is disabled", () => {
    expect(isModelDisabled("llama3.2:latest", ["llama3.2:latest"])).toBe(true);
  });
});

describe("getEnabledModels", () => {
  it("filters disabled models", () => {
    const enabled = getEnabledModels(models, ["llama3.2:latest"]);
    expect(enabled.map((m) => m.name)).toEqual(["qwen3.5:4b"]);
  });
});

describe("getEnabledModelNames", () => {
  it("returns names of enabled models only", () => {
    expect(getEnabledModelNames(models, ["llama3.2:latest"])).toEqual([
      "qwen3.5:4b",
    ]);
  });
});
