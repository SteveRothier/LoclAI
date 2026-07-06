import { describe, expect, it } from "vitest";
import {
  fallbackTitleFromMessage,
  sanitizeGeneratedTitle,
} from "@/lib/chat/title";

describe("fallbackTitleFromMessage", () => {
  it("truncates long messages", () => {
    const long = "a".repeat(80);
    const title = fallbackTitleFromMessage(long);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
  });

  it("returns default for empty input", () => {
    expect(fallbackTitleFromMessage("   ")).toBe("Nouvelle conversation");
  });
});

describe("sanitizeGeneratedTitle", () => {
  const fallback = "Fallback";

  it("strips double quotes", () => {
    expect(sanitizeGeneratedTitle('"Idées de projets tech"', fallback)).toBe(
      "Idées de projets tech"
    );
  });

  it("strips guillemets français", () => {
    expect(sanitizeGeneratedTitle("« Idées tech »", fallback)).toBe("Idées tech");
  });

  it("removes trailing punctuation", () => {
    expect(sanitizeGeneratedTitle("Idées de projets tech.", fallback)).toBe(
      "Idées de projets tech"
    );
  });

  it("truncates to max length", () => {
    const long = "Mot ".repeat(20);
    const title = sanitizeGeneratedTitle(long, fallback);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
  });

  it("uses fallback when empty", () => {
    expect(sanitizeGeneratedTitle("   ", fallback)).toBe(fallback);
  });
});
