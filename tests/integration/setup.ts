import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}

// localStorage mock for happy-dom
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i: number) => [...store.keys()][i] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock navigator for crypto fingerprint
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'test-agent' },
  writable: true,
});

// Mock Intl for timezone fingerprint
Object.defineProperty(globalThis, 'Intl', {
  value: {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: 'UTC' }),
    }),
  },
  writable: true,
});

// Mock fetch to prevent real network calls in integration tests
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.includes('models.dev')) {
    return new Response(JSON.stringify({ models: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return originalFetch(input, init);
};
