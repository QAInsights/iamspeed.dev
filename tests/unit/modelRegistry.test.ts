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

  it("returns fallback models for openrouter when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("openrouter");
    expect(models.length).toBeGreaterThan(0);
    // OpenRouter model ids use provider/model format (e.g. openai/gpt-4o)
    expect(models.some((m) => m.id.includes("/"))).toBe(true);
  });

  it("returns empty array for cerebras when fetch fails (no hardcoded fallback)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("cerebras");
    expect(models).toEqual([]);
  });

  it("falls back to Fireworks serverless models endpoint (not in models.dev)", async () => {
    // models.dev returns data but without a fireworks provider key
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("models.dev")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ google: { models: {} } }),
        });
      }
      if (url.includes("api.fireworks.ai") && url.includes("/models")) {
        // Fireworks management API format: { models: [{ name, displayName, contextLength }] }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            models: [
              { name: "accounts/fireworks/models/llama-v3p1-8b-instruct", displayName: "Llama 3.1 8B Instruct", contextLength: 128000 },
              { name: "accounts/fireworks/models/deepseek-v4-flash", displayName: "DeepSeek-V4-Flash", contextLength: 1048576 },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const models = await loadModels("fireworks", "fw-test-key");
    expect(models.length).toBe(2);
    expect(models.some((m) => m.id === "accounts/fireworks/models/llama-v3p1-8b-instruct")).toBe(true);
    expect(models.some((m) => m.id === "accounts/fireworks/models/deepseek-v4-flash")).toBe(true);
    // Verify displayName is used as label
    expect(models.some((m) => m.label === "Llama 3.1 8B Instruct")).toBe(true);
    expect(models.some((m) => m.label === "DeepSeek-V4-Flash")).toBe(true);
    // Verify contextLength is parsed
    expect(models.some((m) => m.contextWindow === 128000)).toBe(true);
    expect(models.some((m) => m.contextWindow === 1048576)).toBe(true);

    // Verify the API key was sent as Bearer auth to the provider endpoint
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
    const fireworksCall = fetchMock.mock.calls.find(
      (c: unknown[]) => (c[0] as string).includes("api.fireworks.ai")
    );
    expect(fireworksCall).toBeTruthy();
    expect((fireworksCall![1] as Record<string, unknown>).headers).toMatchObject({
      Authorization: "Bearer fw-test-key",
    });
  });

  it("returns empty array for fireworks when both models.dev and provider endpoint fail", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("fireworks");
    expect(models).toEqual([]);
  });

  it("returns cerebras models from models.dev catalog", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        cerebras: {
          models: {
            "llama-3.3-70b": {
              id: "llama-3.3-70b",
              name: "Llama 3.3 70B",
              limit: { context: 128000 },
            },
            "llama3.1-8b": {
              id: "llama3.1-8b",
              name: "Llama 3.1 8B",
              limit: { context: 128000 },
            },
          },
        },
      }),
    });

    const models = await loadModels("cerebras");
    expect(models.length).toBe(2);
    expect(models.some((m) => m.id === "llama-3.3-70b")).toBe(true);
    expect(models.some((m) => m.id === "llama3.1-8b")).toBe(true);
  });

  it("returns google models from models.dev catalog", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        google: {
          models: {
            "gemini-2.5-flash": {
              id: "gemini-2.5-flash",
              name: "Gemini 2.5 Flash",
              limit: { context: 1048576 },
            },
            "gemini-2.5-pro": {
              id: "gemini-2.5-pro",
              name: "Gemini 2.5 Pro",
              limit: { context: 2097152 },
            },
          },
        },
      }),
    });

    const models = await loadModels("google");
    expect(models.length).toBe(2);
    expect(models.some((m) => m.id === "gemini-2.5-flash")).toBe(true);
    expect(models.some((m) => m.id === "gemini-2.5-pro")).toBe(true);
  });

  it("returns empty array for google when fetch fails (no hardcoded fallback)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("google");
    expect(models).toEqual([]);
  });

  it("returns empty array for mistral when fetch fails (no hardcoded fallback)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const models = await loadModels("mistral");
    expect(models).toEqual([]);
  });

  it("returns mistral models from models.dev catalog", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        mistral: {
          models: {
            "mistral-small-latest": {
              id: "mistral-small-latest",
              name: "Mistral Small",
              limit: { context: 128000 },
            },
            "mistral-large-latest": {
              id: "mistral-large-latest",
              name: "Mistral Large",
              limit: { context: 128000 },
            },
          },
        },
      }),
    });

    const models = await loadModels("mistral");
    expect(models.length).toBe(2);
    expect(models.some((m) => m.id === "mistral-small-latest")).toBe(true);
    expect(models.some((m) => m.id === "mistral-large-latest")).toBe(true);
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
    store.set("iamspeed_models_cache_v2", JSON.stringify(cacheEntry));

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
    store.set("iamspeed_models_cache_v2", JSON.stringify(cacheEntry));

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
    store.set("iamspeed_models_cache_v2", "some data");
    clearModelCache();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("iamspeed_models_cache_v2");
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

describe("fetchModelsFromEndpoint", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns empty array when no baseURL", async () => {
    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    const models = await fetchModelsFromEndpoint("");
    expect(models).toEqual([]);
  });

  it("fetches /models and returns entries from data array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: "Meta-Llama-3.1-70B-Instruct" },
          { id: "Meta-Llama-3.1-8B-Instruct" },
        ],
      }),
    });

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    const models = await fetchModelsFromEndpoint("https://api.sambanova.ai/v1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.sambanova.ai/v1/models",
      expect.anything()
    );
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe("Meta-Llama-3.1-70B-Instruct");
    expect(models[0].contextWindow).toBe(0);
  });

  it("returns empty on fetch failure (graceful)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    const models = await fetchModelsFromEndpoint("https://api.sambanova.ai/v1");
    expect(models).toEqual([]);
  });

  it("normalizes base URL by appending /v1 if missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "test-model" }] }),
    });

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    await fetchModelsFromEndpoint("https://api.example.com");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/models",
      expect.anything()
    );
  });

  it("deduplicates and sorts models alphabetically", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: "zebra-model" },
          { id: "alpha-model" },
          { id: "alpha-model" },
          { id: "beta-model" },
        ],
      }),
    });

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    const models = await fetchModelsFromEndpoint("https://api.example.com/v1");

    expect(models).toHaveLength(3);
    expect(models.map((m) => m.id)).toEqual(["alpha-model", "beta-model", "zebra-model"]);
  });

  it("returns empty array for non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    const models = await fetchModelsFromEndpoint("https://api.example.com/v1");
    expect(models).toEqual([]);
  });

  it("sends Authorization header when apiKey is provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "test-model" }] }),
    });
    globalThis.fetch = fetchSpy;

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    await fetchModelsFromEndpoint("https://api.sambanova.ai/v1", "sk-test-key");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.sambanova.ai/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test-key",
        }),
      })
    );
  });

  it("does not send Authorization header when apiKey is omitted", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "test-model" }] }),
    });
    globalThis.fetch = fetchSpy;

    const { fetchModelsFromEndpoint } = await import("../../src/lib/modelRegistry");
    await fetchModelsFromEndpoint("http://localhost:11434/v1");

    const callArgs = fetchSpy.mock.calls[0][1];
    expect(callArgs.headers?.Authorization).toBeUndefined();
  });
});

describe("discoverLocalModels", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns empty array when no baseURL", async () => {
    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    const models = await discoverLocalModels("");
    expect(models).toEqual([]);
  });

  it("fetches /models and returns entries from data array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: "llama3.2", object: "model" },
          { id: "mistral", object: "model" },
        ],
      }),
    });

    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    const models = await discoverLocalModels("http://localhost:11434");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/models"),
      expect.anything()
    );
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe("llama3.2");
    expect(models[0].contextWindow).toBe(0);
  });

  it("returns empty on fetch failure (graceful)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("CORS or down"));

    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    const models = await discoverLocalModels("http://localhost:11434/v1");
    expect(models).toEqual([]);
  });

  it("normalizes base URL by appending /v1 if missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "test-model" }] }),
    });

    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    await discoverLocalModels("http://localhost:11434");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/v1/models",
      expect.anything()
    );
  });

  it("uses already normalized URL with /v1", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "test-model" }] }),
    });

    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    await discoverLocalModels("http://localhost:1234/v1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:1234/v1/models",
      expect.anything()
    );
  });

  it("deduplicates and sorts discovered models alphabetically", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: "zebra-model" },
          { id: "alpha-model" },
          { id: "alpha-model" },
          { id: "beta-model" },
        ],
      }),
    });

    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    const models = await discoverLocalModels("http://localhost:11434/v1");

    expect(models).toHaveLength(3);
    expect(models.map((m) => m.id)).toEqual(["alpha-model", "beta-model", "zebra-model"]);
  });

  it("returns empty array for non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { discoverLocalModels } = await import("../../src/lib/modelRegistry");
    const models = await discoverLocalModels("http://localhost:11434/v1");
    expect(models).toEqual([]);
  });
});
