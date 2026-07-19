export type StreamSegment =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; code: string; incomplete: boolean };

/** Line-start fence only (ignore ``` mid-line inside code). */
export function isFenceLine(line: string): boolean {
  return line.trimStart().startsWith("```");
}

export function parseFenceLanguage(line: string): string {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("```")) return "text";
  const lang = trimmed.slice(3).trim();
  return lang.length > 0 ? lang.split(/\s+/)[0]! : "text";
}

/**
 * Convert VitePress-style `:::lang` … `:::` into ``` fences.
 * Safer in chat prompts: `:::` does not nest/break like triple backticks.
 */
export function expandColonDirectives(content: string): string {
  if (!content.includes(":::")) return content;
  const lines = content.split("\n");
  const out: string[] = [];
  let inColon = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const open = /^:::\s*([\w-]+)\s*$/.exec(trimmed);
    if (!inColon && open) {
      out.push("```" + open[1]);
      inColon = true;
      continue;
    }
    if (inColon && /^:::\s*$/.test(trimmed)) {
      out.push("```");
      inColon = false;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Parse streaming markdown into text + code segments without ReactMarkdown.
 * Closed and open fences both become code segments (open = incomplete).
 */
export function parseStreamingSegments(content: string): StreamSegment[] {
  if (!content) return [];

  const lines = expandColonDirectives(content).split("\n");
  const segments: StreamSegment[] = [];
  let textBuf: string[] = [];
  let inFence = false;
  let language = "text";
  let codeBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length === 0) return;
    const text = textBuf.join("\n");
    textBuf = [];
    if (text.length > 0) segments.push({ kind: "text", text });
  };

  for (const line of lines) {
    if (isFenceLine(line)) {
      if (!inFence) {
        flushText();
        inFence = true;
        language = parseFenceLanguage(line);
        codeBuf = [];
      } else {
        segments.push({
          kind: "code",
          language,
          code: codeBuf.join("\n"),
          incomplete: false,
        });
        inFence = false;
        codeBuf = [];
      }
      continue;
    }
    if (inFence) codeBuf.push(line);
    else textBuf.push(line);
  }

  flushText();
  if (inFence) {
    segments.push({
      kind: "code",
      language,
      code: codeBuf.join("\n"),
      incomplete: true,
    });
  }

  return segments;
}
