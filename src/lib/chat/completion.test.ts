import { describe, expect, it } from "vitest";
import {
  appendWithoutOverlap,
  extractRequestedMinLines,
  hasIncompleteMainBlock,
  isRedundantContinuation,
  looksTruncated,
  shouldContinueGeneration,
  userAskedForLongOutput,
  type OllamaMessage,
} from "@/lib/chat/completion";

describe("looksTruncated", () => {
  it("detects empty if __name__ block", () => {
    const text = `${"print(1)\n".repeat(30)}\nif __name__ == "__main__":\n\n`;
    expect(hasIncompleteMainBlock(text)).toBe(true);
    expect(looksTruncated(text)).toBe(true);
  });

  it("detects unclosed fence", () => {
    expect(looksTruncated("```python\nprint(1)\n")).toBe(true);
  });

  it("returns false for complete short answer", () => {
    expect(looksTruncated("Voici la réponse complète.")).toBe(false);
  });

  it("returns false for complete simple HTTP server snippet", () => {
    const text = `Voici un serveur.\n\n\`\`\`python\nimport http.server\nif __name__ == "__main__":\n    main()\n\`\`\`\n`;
    expect(looksTruncated(text)).toBe(false);
    expect(shouldContinueGeneration(text, "stop", 0)).toBe(false);
  });

  it("does not treat French apostrophes as truncated quotes", () => {
    const text = [
      "Voici un serveur.",
      "",
      "```python",
      "from flask import Flask",
      "app = Flask(__name__)",
      'if __name__ == "__main__":',
      "    app.run(port=8080)",
      "```",
      "",
      "Pour tester, saisissez l'adresse `http://localhost:8080`. Je suis désolé pour cela !",
    ].join("\n");
    expect(looksTruncated(text)).toBe(false);
    expect(shouldContinueGeneration(text, "stop", 0)).toBe(false);
  });

  it("does not continue solely because done_reason is length", () => {
    const text = `Voici un serveur Flask.\n\n\`\`\`python\nfrom flask import Flask\napp = Flask(__name__)\n@app.route("/")\ndef home():\n    return "ok"\nif __name__ == "__main__":\n    app.run(port=8080)\n\`\`\`\n`;
    expect(looksTruncated(text)).toBe(false);
    expect(shouldContinueGeneration(text, "length", 0)).toBe(false);
  });
});

describe("long output requests", () => {
  it("detects explicit long/complex asks", () => {
    const messages: OllamaMessage[] = [
      { role: "user", content: "donne un code complexe et long, plus de 100 lignes" },
    ];
    expect(userAskedForLongOutput(messages)).toBe(true);
    expect(extractRequestedMinLines(messages)).toBe(100);
  });

  it("continues while code is shorter than requested", () => {
    const shortCode = "```python\n" + "x = 1\n".repeat(20) + "```\n";
    expect(
      shouldContinueGeneration(shortCode, "stop", 0, {
        wantsLong: true,
        minCodeLines: 100,
      })
    ).toBe(true);
  });

  it("stops for a simple complete reply without long ask", () => {
    const text = "```python\nprint('ok')\n```\n";
    expect(shouldContinueGeneration(text, "stop", 0)).toBe(false);
  });
});

describe("isRedundantContinuation", () => {
  it("detects repeated code block + apology loop", () => {
    const route = `@app.route('/message', methods=['GET'])
def message():
    if 'message' in request.args:
        return request.args['message']
    else:
        return "Aucun message à afficher."`;
    const base = `\`\`\`python\nfrom flask import Flask\n${route}\n\`\`\``;
    const next = `Je suis désolé pour mon erreur précédente. Voici la continuation :\n\`\`\`python\n${route}\n\`\`\``;
    expect(isRedundantContinuation(base, next)).toBe(true);
  });

  it("allows genuinely new code", () => {
    const base = "```python\ndef home():\n    return 'a'\n```";
    const next =
      "```python\n@app.route('/b')\ndef other():\n    return 'b'\n```";
    expect(isRedundantContinuation(base, next)).toBe(false);
  });
});

describe("appendWithoutOverlap", () => {
  it("strips repeated suffix/prefix overlap", () => {
    expect(
      appendWithoutOverlap(
        "début du code\nfin_commune_ABC",
        "fin_commune_ABCsuite"
      )
    ).toBe("début du code\nfin_commune_ABCsuite");
  });
});
