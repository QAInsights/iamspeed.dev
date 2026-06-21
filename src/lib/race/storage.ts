import { RACE_LANE_COUNT } from "./types";

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

/** Default lane ids, stable across reloads. */
export const DEFAULT_LANE_IDS = ["lane-1", "lane-2", "lane-3"] as const;

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
      .slice(0, RACE_LANE_COUNT);
  } catch {
    return [];
  }
}

export function saveRaceConfigs(configs: StoredRaceConfig[]): void {
  try {
    const sanitized = configs
      .filter((c) => c && c.laneId && c.providerId && c.modelId)
      .slice(0, RACE_LANE_COUNT);
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
