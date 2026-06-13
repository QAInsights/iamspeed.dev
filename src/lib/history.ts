const HISTORY_KEY = "iamspeed_history";
const MAX_RUNS = 5;

export interface RunSummary {
  model: string;
  provider: string;
  tokensPerSecond: number | null;
  ttft: number | null;
  totalTime: number | null;
  timestamp: number;
}

export function loadHistory(): RunSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRun(run: RunSummary): RunSummary[] {
  const history = [run, ...loadHistory()].slice(0, MAX_RUNS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
  return history;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
