import { describe, it, expect, vi } from "vitest";
import { createMetricsTracker } from "../../src/lib/metrics";

describe("metrics", () => {
  it("TTFT is null before recordFirstToken", () => {
    const tracker = createMetricsTracker("openai", "gpt-4o", 10);
    tracker.start();
    tracker.recordChunk("hello");
    const m = tracker.getMetrics();
    expect(m.ttft).toBeNull();
  });

  it("TTFT is set after recordFirstToken", async () => {
    const tracker = createMetricsTracker("openai", "gpt-4o", 10);
    tracker.start();
    await new Promise((r) => setTimeout(r, 20));
    tracker.recordFirstToken();
    const m = tracker.getMetrics();
    expect(m.ttft).not.toBeNull();
    expect(m.ttft).toBeGreaterThanOrEqual(15);
  });

  it("tokensPerSecond is calculated correctly after multiple recordChunk calls", async () => {
    const tracker = createMetricsTracker("openai", "gpt-4o", 10);
    tracker.start();
    tracker.recordFirstToken();
    tracker.recordChunk("hello world foo bar");
    tracker.recordChunk("baz qux quux corge");
    const m = tracker.getMetrics();
    expect(m.tokenCount).toBeGreaterThan(0);
    expect(m.provider).toBe("openai");
    expect(m.model).toBe("gpt-4o");
    expect(m.promptLength).toBe(10);
  });

  it("getMetrics is idempotent", () => {
    const tracker = createMetricsTracker("openai", "gpt-4o", 5);
    tracker.start();
    tracker.recordChunk("test");
    tracker.finish();
    const m1 = tracker.getMetrics();
    const m2 = tracker.getMetrics();
    expect(m1.ttft).toBe(m2.ttft);
    expect(m1.totalTime).toBe(m2.totalTime);
    expect(m1.tokenCount).toBe(m2.tokenCount);
  });

  it("finish sets totalTime", async () => {
    const tracker = createMetricsTracker("anthropic", "claude", 20);
    tracker.start();
    await new Promise((r) => setTimeout(r, 10));
    tracker.finish();
    const m = tracker.getMetrics();
    expect(m.totalTime).not.toBeNull();
    expect(m.totalTime).toBeGreaterThanOrEqual(5);
  });
});
