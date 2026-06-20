import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadPrefs, savePrefs, type Prefs } from '../../src/lib/prefs';

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

describe('prefs', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('returns empty object when no prefs stored', () => {
    const prefs = loadPrefs();
    expect(prefs).toEqual({});
  });

  it('saves and loads basic prefs', () => {
    const testPrefs: Prefs = {
      providerId: 'openai',
      modelId: 'gpt-4o',
      prompt: 'Hello',
    };
    savePrefs(testPrefs);
    const loaded = loadPrefs();
    expect(loaded).toEqual(testPrefs);
  });

  it('saves and loads baseUrl for local provider', () => {
    const testPrefs: Prefs = {
      providerId: 'local',
      modelId: 'llama3.2',
      prompt: 'Test prompt',
      baseUrl: 'http://localhost:11434/v1',
    };
    savePrefs(testPrefs);
    expect(localStorageMock.setItem).toHaveBeenCalled();

    const loaded = loadPrefs();
    expect(loaded.providerId).toBe('local');
    expect(loaded.baseUrl).toBe('http://localhost:11434/v1');
    expect(loaded.modelId).toBe('llama3.2');
  });

  it('handles missing baseUrl gracefully', () => {
    const testPrefs: Prefs = {
      providerId: 'local',
      modelId: 'mistral',
    };
    savePrefs(testPrefs);
    const loaded = loadPrefs();
    expect(loaded.baseUrl).toBeUndefined();
  });

  it('ignores localStorage errors on load', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('storage blocked'); });
    const prefs = loadPrefs();
    expect(prefs).toEqual({});
  });

  it('ignores localStorage errors on save', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => savePrefs({ providerId: 'local', baseUrl: 'http://127.0.0.1:1234/v1' })).not.toThrow();
  });
});