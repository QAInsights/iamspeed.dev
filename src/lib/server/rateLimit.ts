const MAX_HITS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map<string, number[]>();

export function checkRateLimit(deviceHash: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const hits = (store.get(deviceHash) ?? []).filter((t) => t > cutoff);
  if (hits.length >= MAX_HITS) return false;

  hits.push(now);
  store.set(deviceHash, hits);
  return true;
}
