import { describe, expect, it } from "vitest";
import {
  formatModelNotFoundError,
  isModelAvailable,
  type OllamaModel,
} from "@/lib/ollama/client";
import { isModelInstalled } from "@/lib/ollama/library";

const models: OllamaModel[] = [
  { name: "qwen3.5:4b", size: 1, modified_at: "" },
  { name: "llama3.2:latest", size: 2, modified_at: "" },
];

describe("isModelAvailable", () => {
  it("returns true when model exists", () => {
    expect(isModelAvailable("qwen3.5:4b", models)).toBe(true);
  });

  it("returns false when model is missing", () => {
    expect(isModelAvailable("missing", models)).toBe(false);
  });

  it("returns true when model name is empty", () => {
    expect(isModelAvailable("", models)).toBe(true);
  });
});

describe("formatModelNotFoundError", () => {
  it("lists available models when present", () => {
    const message = formatModelNotFoundError("missing", models);
    expect(message).toContain("missing");
    expect(message).toContain("qwen3.5:4b");
    expect(message).toContain("ollama pull");
  });
});

describe("isModelInstalled", () => {
  it("matches exact pull name", () => {
    expect(isModelInstalled("qwen3.5:4b", ["qwen3.5:4b"])).toBe(true);
  });

  it("matches base model name", () => {
    expect(isModelInstalled("llama3.2", ["llama3.2:latest"])).toBe(true);
  });
});
