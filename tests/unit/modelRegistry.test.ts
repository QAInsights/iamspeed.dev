import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
  removeItem: vi.fn((key: string) => { store.delete(key); }),
  clear: vi.fn(() => store.clear()),
  get length() { return store.size; },
  key: vi.fn((i: number) => [...store.keys()][i] ?? null),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const { loadModels, clearModelCache } = await import("../../src/lib/modelRegistry");

describe("modelRegistry", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns fallback models when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("openai");
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].id).toBeTruthy();
    expect(models[0].label).toBeTruthy();
  });

  it("returns fallback models for anthropic when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("anthropic");
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.id.includes("claude"))).toBe(true);
  });

  it("caches models after successful fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: {
          "openai/gpt-4o": {
            id: "openai/gpt-4o",
            name: "GPT-4o",
            limit: { context: 128000 },
          },
        },
      }),
    });

    await loadModels("openai");
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("uses cached data when available and fresh", async () => {
    const cacheEntry = {
      data: {
        "openai/gpt-4o": {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          limit: { context: 128000 },
        },
      },
      timestamp: Date.now(),
    };
    store.set("iamspeed_models_cache", JSON.stringify(cacheEntry));

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const models = await loadModels("openai");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(models.length).toBe(1);
    expect(models[0].id).toBe("openai/gpt-4o");
  });

  it("refetches when cache is stale", async () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    const cacheEntry = {
      data: {
        "openai/gpt-4o": {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          limit: { context: 128000 },
        },
      },
      timestamp: staleTimestamp,
    };
    store.set("iamspeed_models_cache", JSON.stringify(cacheEntry));

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: {
          "openai/gpt-5": {
            id: "openai/gpt-5",
            name: "GPT-5",
            limit: { context: 256000 },
          },
        },
      }),
    });

    const models = await loadModels("openai");
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(models[0].id).toBe("openai/gpt-5");
  });

  it("clearModelCache removes cached data", () => {
    store.set("iamspeed_models_cache", "some data");
    clearModelCache();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("iamspeed_models_cache");
  });

  it("returns empty array for unknown provider", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("unknown-provider");
    expect(models).toEqual([]);
  });

  it("sorts models by context window descending", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: {
          "openai/small": {
            id: "openai/small",
            name: "Small",
            limit: { context: 4000 },
          },
          "openai/large": {
            id: "openai/large",
            name: "Large",
            limit: { context: 128000 },
          },
          "openai/medium": {
            id: "openai/medium",
            name: "Medium",
            limit: { context: 32000 },
          },
        },
      }),
    });

    const models = await loadModels("openai");
    expect(models[0].id).toBe("openai/large");
    expect(models[1].id).toBe("openai/medium");
    expect(models[2].id).toBe("openai/small");
  });
});
