export interface BenchmarkMetrics {
  ttft: number | null;
  totalTime: number | null;
  tokenCount: number;
  tokensPerSecond: number | null;
  provider: string;
  model: string;
  promptLength: number;
}

export interface MetricsTracker {
  start(): void;
  recordFirstToken(): void;
  recordChunk(text: string): void;
  finish(): void;
  getMetrics(): BenchmarkMetrics;
}

function estimateTokenCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function createMetricsTracker(provider: string, model: string, promptLength: number): MetricsTracker {
  let startTime: number | null = null;
  let firstTokenTime: number | null = null;
  let endTime: number | null = null;
  let totalText = "";
  let tokenCount = 0;

  return {
    start() {
      startTime = performance.now();
      firstTokenTime = null;
      endTime = null;
      totalText = "";
      tokenCount = 0;
    },

    recordFirstToken() {
      if (firstTokenTime === null && startTime !== null) {
        firstTokenTime = performance.now() - startTime;
      }
    },

    recordChunk(text: string) {
      totalText += text;
      tokenCount = estimateTokenCount(totalText);
    },

    finish() {
      if (startTime !== null) {
        endTime = performance.now() - startTime;
      }
    },

    getMetrics(): BenchmarkMetrics {
      const elapsed = endTime ?? (startTime !== null ? performance.now() - startTime : null);
      const tokensPerSecond = elapsed && elapsed > 0 ? (tokenCount / elapsed) * 1000 : null;

      return {
        ttft: firstTokenTime,
        totalTime: endTime,
        tokenCount,
        tokensPerSecond: tokensPerSecond !== null ? Math.round(tokensPerSecond * 10) / 10 : null,
        provider,
        model,
        promptLength,
      };
    },
  };
}
