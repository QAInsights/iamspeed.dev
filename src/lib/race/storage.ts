import { MIN_RACE_LANES, MAX_RACE_LANES } from "./types";

/**
 * Persistence for Race Mode configs. Mirrors the prefs.ts pattern: thin
 * localStorage wrappers that fail silently on quota/parse errors.
 *
 * API keys are NOT stored here — they live in the encrypted crypto store
 * (same as simple mode). Only provider/model/baseUrl per lane is persisted,
 * keyed by laneId so a lane's choice survives reloads.
 */

const RACE_CONFIGS_KEY = "iamspeed_race_configs";
const RACE_MODE_KEY = "iamspeed_mode";

export type AppMode = "simple" | "race";

/** Default lane ids for a fresh (min-lane) setup. Stable across reloads. */
export const DEFAULT_LANE_IDS = ["lane-1", "lane-2"] as const;

/**
 * Determine the initial set of lane ids given whatever was persisted. Restores
 * saved lanes (capped to MAX_RACE_LANES), but never goes below MIN_RACE_LANES.
 * Lane ids are stable `lane-N` strings so saved configs rehydrate by index.
 */
export function initialLaneIds(stored: StoredRaceConfig[]): string[] {
  const count = Math.min(MAX_RACE_LANES, Math.max(MIN_RACE_LANES, stored.length));
  return Array.from({ length: count }, (_, i) => `lane-${i + 1}`);
}

/**
 * Stored race config — same as RaceConfig but without the apiKey, which is
 * loaded separately from the encrypted store at run time.
 */
export interface StoredRaceConfig {
  laneId: string;
  providerId: string;
  modelId: string;
  baseUrl?: string;
}

export function loadRaceConfigs(): StoredRaceConfig[] {
  try {
    const raw = localStorage.getItem(RACE_CONFIGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape; drop anything malformed.
    return parsed
      .filter((c): c is StoredRaceConfig =>
        c &&
        typeof c.laneId === "string" &&
        typeof c.providerId === "string" &&
        typeof c.modelId === "string",
      )
      .slice(0, MAX_RACE_LANES);
  } catch {
    return [];
  }
}

export function saveRaceConfigs(configs: StoredRaceConfig[]): void {
  try {
    const sanitized = configs
      .filter((c) => c && c.laneId && c.providerId && c.modelId)
      .slice(0, MAX_RACE_LANES);
    localStorage.setItem(RACE_CONFIGS_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore quota errors
  }
}

export function clearRaceConfigs(): void {
  try {
    localStorage.removeItem(RACE_CONFIGS_KEY);
  } catch {
    // ignore
  }
}

export function loadMode(): AppMode {
  try {
    const raw = localStorage.getItem(RACE_MODE_KEY);
    return raw === "race" ? "race" : "simple";
  } catch {
    return "simple";
  }
}

export function saveMode(mode: AppMode): void {
  try {
    localStorage.setItem(RACE_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
