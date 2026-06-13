import { describe, it, expect, beforeEach } from "vitest";
import { loadHistory, saveRun, clearHistory, type RunSummary } from "../../src/lib/history";

const mockStorage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { mockStorage.set(key, value); },
  removeItem: (key: string) => { mockStorage.delete(key); },
  clear: () => { mockStorage.clear(); },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

function makeRun(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    model: "gpt-4o",
    provider: "openai",
    tokensPerSecond: 50,
    ttft: 200,
    totalTime: 3000,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("history", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("loadHistory returns empty array when nothing stored", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("loadHistory returns empty array for invalid JSON", () => {
    mockStorage.set("iamspeed_history", "not-json");
    expect(loadHistory()).toEqual([]);
  });

  it("saveRun prepends a run to history", () => {
    const run1 = makeRun({ model: "gpt-4o" });
    saveRun(run1);
    const run2 = makeRun({ model: "claude-3-opus" });
    const history = saveRun(run2);

    expect(history).toHaveLength(2);
    expect(history[0].model).toBe("claude-3-opus");
    expect(history[1].model).toBe("gpt-4o");
  });

  it("saveRun caps history at 5 entries", () => {
    for (let i = 0; i < 7; i++) {
      saveRun(makeRun({ model: `model-${i}` }));
    }
    const history = loadHistory();
    expect(history).toHaveLength(5);
    expect(history[0].model).toBe("model-6");
    expect(history[4].model).toBe("model-2");
  });

  it("saveRun persists to localStorage", () => {
    saveRun(makeRun({ model: "gpt-4o-mini" }));
    const raw = mockStorage.get("iamspeed_history");
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].model).toBe("gpt-4o-mini");
  });

  it("clearHistory removes all history from localStorage", () => {
    saveRun(makeRun({ model: "model-1" }));
    saveRun(makeRun({ model: "model-2" }));
    expect(loadHistory()).toHaveLength(2);

    clearHistory();

    expect(loadHistory()).toEqual([]);
    expect(mockStorage.has("iamspeed_history")).toBe(false);
  });
});
