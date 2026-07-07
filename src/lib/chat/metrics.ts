import type { MessageMetrics } from "@/lib/db/schema";

export function formatMessageMetrics(metrics: MessageMetrics): string {
  const tokensPerSecond =
    metrics.durationMs > 0
      ? Math.round((metrics.completionTokens / metrics.durationMs) * 1000)
      : 0;
  const durationSec =
    metrics.durationMs >= 1000
      ? `${(metrics.durationMs / 1000).toFixed(1)} s`
      : `${metrics.durationMs} ms`;

  return `${metrics.completionTokens} tokens · ${tokensPerSecond} tok/s · ${durationSec}`;
}
