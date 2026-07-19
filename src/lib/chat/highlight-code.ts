import hljs from "highlight.js/lib/common";

const LANG_ALIASES: Record<string, string> = {
  jsx: "javascript",
  tsx: "typescript",
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
};

/**
 * Highlight code for streaming + final parity (same hljs theme as rehype-highlight).
 */
export function highlightCode(code: string, language: string): string {
  const raw = (language || "text").toLowerCase();
  if (raw === "text" || raw === "plain" || raw === "txt") {
    return escapeHtml(code);
  }

  const lang = LANG_ALIASES[raw] ?? raw;

  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
  } catch {
    // fall through
  }

  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
