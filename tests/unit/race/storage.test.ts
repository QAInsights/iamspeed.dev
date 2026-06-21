import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadRaceConfigs,
  saveRaceConfigs,
  clearRaceConfigs,
  loadMode,
  saveMode,
  type StoredRaceConfig,
} from "../../../src/lib/race/storage";

const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => store.clear()),
  get length() {
    return store.size;
  },
  key: vi.fn((i: number) => [...store.keys()][i] ?? null),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("race storage", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  describe("loadRaceConfigs / saveRaceConfigs", () => {
    it("returns empty array when nothing stored", () => {
      expect(loadRaceConfigs()).toEqual([]);
    });

    it("saves and loads configs", () => {
      const configs: StoredRaceConfig[] = [
        { laneId: "lane-1", providerId: "openai", modelId: "gpt-4o" },
        { laneId: "lane-2", providerId: "anthropic", modelId: "claude-3-5-sonnet" },
        { laneId: "lane-3", providerId: "groq", modelId: "llama-3.1-70b" },
      ];
      saveRaceConfigs(configs);
      const loaded = loadRaceConfigs();
      expect(loaded).toEqual(configs);
    });

    it("persists baseUrl for local lanes", () => {
      const configs: StoredRaceConfig[] = [
        { laneId: "lane-1", providerId: "local", modelId: "llama3.2", baseUrl: "http://localhost:11434/v1" },
      ];
      saveRaceConfigs(configs);
      const loaded = loadRaceConfigs();
      expect(loaded[0].baseUrl).toBe("http://localhost:11434/v1");
    });

    it("drops malformed entries on load", () => {
      // Manually inject malformed JSON: a valid array but with bad entries
      store.set(
        "iamspeed_race_configs",
        JSON.stringify([
          { laneId: "lane-1", providerId: "openai", modelId: "gpt-4o" },
          { laneId: 123, providerId: "bad" }, // missing modelId, wrong types
          { providerId: "no-lane-id" },
          "not-an-object",
        ]),
      );
      const loaded = loadRaceConfigs();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].laneId).toBe("lane-1");
    });

    it("returns empty array on corrupt JSON", () => {
      store.set("iamspeed_race_configs", "{not valid json");
      expect(loadRaceConfigs()).toEqual([]);
    });

    it("returns empty array when stored value is not an array", () => {
      store.set("iamspeed_race_configs", JSON.stringify({ not: "an array" }));
      expect(loadRaceConfigs()).toEqual([]);
    });

    it("caps stored configs to RACE_LANE_COUNT (3)", () => {
      const configs: StoredRaceConfig[] = [
        { laneId: "lane-1", providerId: "openai", modelId: "a" },
        { laneId: "lane-2", providerId: "openai", modelId: "b" },
        { laneId: "lane-3", providerId: "openai", modelId: "c" },
        { laneId: "lane-4", providerId: "openai", modelId: "d" },
      ];
      saveRaceConfigs(configs);
      const loaded = loadRaceConfigs();
      expect(loaded).toHaveLength(3);
      expect(loaded.map((c) => c.laneId)).toEqual(["lane-1", "lane-2", "lane-3"]);
    });

    it("ignores localStorage errors on save", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("quota");
      });
      expect(() =>
        saveRaceConfigs([{ laneId: "lane-1", providerId: "openai", modelId: "gpt-4o" }]),
      ).not.toThrow();
    });

    it("ignores localStorage errors on load", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("storage blocked");
      });
      expect(loadRaceConfigs()).toEqual([]);
    });

    it("clearRaceConfigs removes the key", () => {
      saveRaceConfigs([{ laneId: "lane-1", providerId: "openai", modelId: "gpt-4o" }]);
      clearRaceConfigs();
      expect(loadRaceConfigs()).toEqual([]);
    });
  });

  describe("loadMode / saveMode", () => {
    it("defaults to simple", () => {
      expect(loadMode()).toBe("simple");
    });

    it("saves and loads race mode", () => {
      saveMode("race");
      expect(loadMode()).toBe("race");
    });

    it("saves and loads simple mode", () => {
      saveMode("race");
      saveMode("simple");
      expect(loadMode()).toBe("simple");
    });

    it("returns simple for unknown values", () => {
      store.set("iamspeed_mode", "bogus");
      expect(loadMode()).toBe("simple");
    });

    it("ignores storage errors on load", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("blocked");
      });
      expect(loadMode()).toBe("simple");
    });

    it("ignores storage errors on save", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("quota");
      });
      expect(() => saveMode("race")).not.toThrow();
    });
  });
});
