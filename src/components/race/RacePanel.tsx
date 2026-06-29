/** @jsxImportSource preact */
import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { runRace } from "../../lib/race/runner";
import type { RaceConfig, LaneState, RaceResult, RaceHandle } from "../../lib/race/types";
import { LANE_COLORS } from "../../lib/race/types";
import { providers } from "../../lib/providers";
import { PROVIDERS, LOCAL_PROVIDER_ID, DEFAULT_PROMPT } from "../../lib/config";
import { loadModels, discoverLocalModels, type ModelEntry } from "../../lib/modelRegistry";
import { loadKey, hasStoredKey } from "../../lib/crypto";
import {
  loadRaceConfigs,
  saveRaceConfigs,
  initialLaneIds,
  type StoredRaceConfig,
} from "../../lib/race/storage";
import { playTick } from "../../lib/audio";
import { playRev, playFinish } from "../../lib/race/sound";
import { MIN_RACE_LANES, MAX_RACE_LANES } from "../../lib/race/types";
import { RaceSetupBar } from "./RaceSetupBar";
import { RaceTrack } from "./RaceTrack";
import { RacePodium } from "./RacePodium";
import "../../styles/components/RacePanel.css";
import "../../styles/components/RaceTrack.css";

type RaceState = "idle" | "running" | "done" | "error";

interface LaneConfig {
  laneId: string;
  providerId: string;
  modelId: string;
  baseUrl?: string;
  models: ModelEntry[];
  hasKey: boolean;
}

function makeInitialLane(laneId: string, stored?: StoredRaceConfig): LaneConfig {
  return {
    laneId,
    providerId: stored?.providerId ?? "openai",
    modelId: stored?.modelId ?? "",
    baseUrl: stored?.baseUrl,
    models: [],
    hasKey: false,
  };
}

function makeIdleLaneState(laneId: string): LaneState {
  return {
    laneId,
    providerId: "",
    modelId: "",
    status: "idle" as const,
    tps: null,
    ttft: null,
    ttlt: null,
    tokenCount: 0,
    inputTokens: null,
    outputTokens: null,
    text: "",
    providerQueued: false,
    finishRank: null,
  };
}

interface RacePanelProps {
  soundEnabled: boolean;
  showFooter?: boolean;
}

export function RacePanel({ soundEnabled, showFooter = true }: RacePanelProps) {
  const [prompt, setPrompt] = useState<string>(() => DEFAULT_PROMPT);
  const [raceState, setRaceState] = useState<RaceState>("idle");

  const storedConfigs = loadRaceConfigs();
  const [startLaneIds] = useState<string[]>(() => initialLaneIds(storedConfigs));
  const [configs, setConfigs] = useState<LaneConfig[]>(() =>
    startLaneIds.map((id, i) => makeInitialLane(id, storedConfigs[i])),
  );
  const [lanes, setLanes] = useState<LaneState[]>(() =>
    startLaneIds.map((id) => makeIdleLaneState(id)),
  );
  const [results, setResults] = useState<RaceResult[] | null>(null);
  const [baseUrlLane, setBaseUrlLane] = useState<string | null>(null);

  const soundRef = useRef(soundEnabled);
  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  const handleRef = useRef<RaceHandle | null>(null);
  const firstFinishPlayedRef = useRef(false);

  // Persist configs whenever they change.
  useEffect(() => {
    saveRaceConfigs(
      configs.map((c) => ({
        laneId: c.laneId,
        providerId: c.providerId,
        modelId: c.modelId,
        baseUrl: c.baseUrl,
      })),
    );
  }, [configs]);

  // Load models + check stored keys for each lane on mount and when provider/baseUrl changes.
  useEffect(() => {
    for (const config of configs) {
      const isLocal = config.providerId === LOCAL_PROVIDER_ID;
      const loader = (async () => {
        if (isLocal && config.baseUrl) {
          return discoverLocalModels(config.baseUrl);
        }
        // Load stored key first — some providers need auth to list models
        const storedKey = await loadKey(config.providerId);
        return loadModels(config.providerId, storedKey || undefined);
      })();
      loader.then((models) => {
        setConfigs((prev) =>
          prev.map((c) => {
            if (c.laneId !== config.laneId) return c;
            const isValid = c.modelId && models.some((m) => m.id === c.modelId);
            return {
              ...c,
              models,
              modelId: isValid ? c.modelId : models[0]?.id ?? "",
              hasKey: isLocal ? true : hasStoredKey(c.providerId),
            };
          }),
        );
      });
    }
    // Intentionally depend on a derived string so we refetch when any lane's
    // provider or baseUrl changes, not on every config object identity shift.
  }, [configs.map((c) => `${c.providerId}|${c.baseUrl ?? ""}`).join(",")]);

  const updateLaneConfig = useCallback(
    (laneId: string, patch: Partial<LaneConfig>) => {
      setConfigs((prev) => prev.map((c) => (c.laneId === laneId ? { ...c, ...patch } : c)));
    },
    [],
  );

  const addLane = useCallback(() => {
    setConfigs((prev) => {
      if (prev.length >= MAX_RACE_LANES) return prev;
      // Pick the next stable lane-N id that isn't already in use.
      let n = prev.length + 1;
      const used = new Set(prev.map((c) => c.laneId));
      while (used.has(`lane-${n}`)) n++;
      const laneId = `lane-${n}`;
      const next = [...prev, makeInitialLane(laneId)];
      setLanes(next.map((c) => makeIdleLaneState(c.laneId)));
      return next;
    });
  }, []);

  const removeLane = useCallback((laneId: string) => {
    setConfigs((prev) => {
      if (prev.length <= MIN_RACE_LANES) return prev;
      const next = prev.filter((c) => c.laneId !== laneId);
      setLanes(next.map((c) => makeIdleLaneState(c.laneId)));
      return next;
    });
  }, []);

  const providerNames: Record<string, string> = {};
  const laneIndexById: Record<string, number> = {};
  for (let i = 0; i < configs.length; i++) {
    providerNames[configs[i].laneId] = PROVIDERS[configs[i].providerId]?.displayName ?? configs[i].providerId;
    laneIndexById[configs[i].laneId] = i;
  }

  const allConfigured = configs.every((c) => c.modelId && (c.providerId === LOCAL_PROVIDER_ID || c.hasKey));
  const canStart = allConfigured && prompt.trim().length > 0 && raceState !== "running";

  const handleStart = useCallback(async () => {
    // Load API keys from the encrypted store for each lane.
    const raceConfigs: RaceConfig[] = [];
    for (const c of configs) {
      const isLocal = c.providerId === LOCAL_PROVIDER_ID;
      const apiKey = isLocal ? "" : await loadKey(c.providerId) ?? "";
      if (!isLocal && !apiKey) return; // missing key — abort start
      raceConfigs.push({
        laneId: c.laneId,
        providerId: c.providerId,
        modelId: c.modelId,
        apiKey,
        baseUrl: c.baseUrl,
      });
    }

    setRaceState("running");
    setResults(null);
    firstFinishPlayedRef.current = false;
    if (soundRef.current) playRev();

    // Reset lane states to match the current config set.
    setLanes(configs.map((c) => makeIdleLaneState(c.laneId)));

    const handle = runRace(
      raceConfigs,
      prompt,
      {
        onLaneUpdate: (lane) => {
          setLanes((prev) => {
            const idx = prev.findIndex((l) => l.laneId === lane.laneId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = lane;
            return next;
          });
          if (soundRef.current && lane.tps !== null) {
            playTick(lane.tps);
          }
        },
        onLaneFinish: (lane, rank) => {
          if (!firstFinishPlayedRef.current && rank === 1) {
            firstFinishPlayedRef.current = true;
            if (soundRef.current) playFinish();
          }
        },
        onAllDone: (res) => {
          setResults(res);
          setRaceState("done");
        },
      },
      providers,
    );
    handleRef.current = handle;
  }, [configs, prompt]);

  const handleStop = useCallback(() => {
    handleRef.current?.abort();
    setRaceState("done");
  }, []);

  return (
    <div class="race-app">
      <div class="race-setup-wrap">
        <RaceSetupBar
          prompt={prompt}
          onPromptChange={setPrompt}
          raceState={raceState}
          onStart={handleStart}
          onStop={handleStop}
          canStart={canStart}
        />
      </div>

      {/* Lane config rows — shown when idle/done, hidden while running for focus. */}
      {raceState !== "running" && (
        <div class="race-config-rows" role="group" aria-label="Lane configuration">
          {configs.map((c, i) => {
            const color = LANE_COLORS[i] ?? LANE_COLORS[0];
            const isLocal = c.providerId === LOCAL_PROVIDER_ID;
            return (
              <div class="race-config-row" style={`--lane-color: ${color.hex};`} key={c.laneId}>
                <span class="race-config-badge">{color.label}</span>
                <select
                  class="race-config-provider"
                  value={c.providerId}
                  onChange={(e) => {
                    const providerId = (e.target as HTMLSelectElement).value;
                    updateLaneConfig(c.laneId, {
                      providerId,
                      modelId: "",
                      hasKey: providerId === LOCAL_PROVIDER_ID ? true : hasStoredKey(providerId),
                    });
                  }}
                  aria-label={`Lane ${i + 1} provider`}
                >
                  {Object.entries(PROVIDERS).map(([id, p]) => (
                    <option key={id} value={id}>{p.displayName}</option>
                  ))}
                </select>
                <select
                  class="race-config-model"
                  value={c.modelId}
                  onChange={(e) => updateLaneConfig(c.laneId, { modelId: (e.target as HTMLSelectElement).value })}
                  disabled={c.models.length === 0}
                  aria-label={`Lane ${i + 1} model`}
                >
                  {c.models.length === 0 && <option value="">Loading models…</option>}
                  {c.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                {!isLocal && (
                  <span class={`race-key-status${c.hasKey ? " ok" : " missing"}`}>
                    {c.hasKey ? "🔑 set" : "🔑 needed"}
                  </span>
                )}
                {isLocal && (
                  <button
                    class="race-config-baseurl-btn"
                    onClick={() => setBaseUrlLane(c.laneId)}
                    aria-label={`Lane ${i + 1} base URL settings`}
                    title={c.baseUrl ? c.baseUrl : "Configure base URL"}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                )}
                {configs.length > MIN_RACE_LANES && (
                  <button
                    class="race-config-remove"
                    onClick={() => removeLane(c.laneId)}
                    aria-label={`Remove lane ${i + 1}`}
                    title="Remove lane"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          {configs.length < MAX_RACE_LANES && (
            <button
              class="race-config-add"
              onClick={addLane}
              aria-label="Add a lane"
              title="Add another racer"
              type="button"
            >
              + Add a racer
            </button>
          )}
          {!allConfigured && (
            <div class="race-config-hint">
              Pick your racers. Same prompt. Same track. Different engines.
              {!configs.some((c) => c.hasKey || c.providerId === LOCAL_PROVIDER_ID) && (
                <span class="race-config-hint-keys"> Set API keys in Simple mode first (gear icon).</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Podium after race completes — shown above the track so results are seen first. */}
      {raceState === "done" && results && (
        <RacePodium results={results} providerNames={providerNames} laneIndexById={laneIndexById} />
      )}

      {/* Live race track during race + after. */}
      {(raceState === "running" || raceState === "done") && (
        <RaceTrack lanes={lanes} providerNames={providerNames} />
      )}

      {showFooter && (
        <footer class="race-footer">
          Doc Hudson says: it's not about speed, it's about consistency.
        </footer>
      )}

      {/* Base URL dialog for local provider lanes. */}
      {baseUrlLane && (() => {
        const config = configs.find((c) => c.laneId === baseUrlLane);
        if (!config) return null;
        const laneIdx = configs.findIndex((c) => c.laneId === baseUrlLane);
        const color = LANE_COLORS[laneIdx] ?? LANE_COLORS[0];
        return (
          <div class="race-baseurl-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBaseUrlLane(null); }}>
            <div class="race-baseurl-dialog" style={`--lane-color: ${color.hex};`}>
              <div class="race-baseurl-header">
                <h3 class="race-baseurl-title">{color.label} - Base URL</h3>
                <button class="race-baseurl-close" onClick={() => setBaseUrlLane(null)} aria-label="Close" type="button">&#x2715;</button>
              </div>
              <label class="race-baseurl-label" for={`baseurl-${baseUrlLane}`}>
                Local server endpoint
              </label>
              <input
                id={`baseurl-${baseUrlLane}`}
                class="race-baseurl-input"
                type="text"
                placeholder="http://localhost:11434/v1"
                value={config.baseUrl ?? ""}
                onInput={(e) => updateLaneConfig(baseUrlLane, { baseUrl: (e.target as HTMLInputElement).value })}
                autoFocus
              />
              <p class="race-baseurl-hint">
                Ollama: <code>http://localhost:11434/v1</code> · LM Studio: <code>http://localhost:1234/v1</code>
              </p>
              <button class="race-baseurl-done" onClick={() => setBaseUrlLane(null)} type="button">Done</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
