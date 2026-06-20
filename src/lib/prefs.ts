const PREFS_KEY = "iamspeed_prefs";

export interface Prefs {
  providerId?: string;
  modelId?: string;
  prompt?: string;
  baseUrl?: string;
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
