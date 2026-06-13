import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
  removeItem: vi.fn((key: string) => { store.delete(key); }),
  clear: vi.fn(() => store.clear()),
  get length() { return store.size; },
  key: vi.fn((i: number) => [...store.keys()][i] ?? null),
};

// Mock navigator and window for fingerprint
Object.defineProperty(globalThis, "navigator", {
  value: { userAgent: "test-agent" },
  writable: true,
});

Object.defineProperty(globalThis, "window", {
  value: { screen: { width: 1920, height: 1080 } },
  writable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, "Intl", {
  value: {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: "UTC" }),
    }),
  },
  writable: true,
});

const { saveKey, loadKey, clearKey, hasStoredKey } = await import("../../src/lib/crypto");

describe("crypto", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("saveKey then loadKey returns the original key", async () => {
    const rawKey = "sk-test-abc123";
    await saveKey("openai", rawKey);
    const loaded = await loadKey("openai");
    expect(loaded).toBe(rawKey);
  });

  it("clearKey makes loadKey return null", async () => {
    await saveKey("openai", "sk-test");
    clearKey("openai");
    const loaded = await loadKey("openai");
    expect(loaded).toBeNull();
  });

  it("stored value is not plaintext", async () => {
    const rawKey = "sk-super-secret-key-12345";
    await saveKey("openai", rawKey);
    const stored = localStorageMock.setItem.mock.calls[0][1] as string;
    expect(stored).not.toContain(rawKey);
  });

  it("hasStoredKey returns true when key exists", async () => {
    await saveKey("openai", "sk-test");
    expect(hasStoredKey("openai")).toBe(true);
  });

  it("hasStoredKey returns false when key does not exist", () => {
    expect(hasStoredKey("nonexistent")).toBe(false);
  });
});
