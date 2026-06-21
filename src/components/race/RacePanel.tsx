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
  DEFAULT_LANE_IDS,
  type StoredRaceConfig,
} from "../../lib/race/storage";
import { playTick } from "../../lib/audio";
import { playRev, playFinish } from "../../lib/race/sound";
import { RaceSetupBar } from "./RaceSetupBar";
import { RaceLanes } from "./RaceLanes";
import { RacePodium } from "./RacePodium";
import "../../styles/components/RacePanel.css";

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

interface RacePanelProps {
  soundEnabled: boolean;
}

export function RacePanel({ soundEnabled }: RacePanelProps) {
  const [prompt, setPrompt] = useState<string>(() => DEFAULT_PROMPT);
  const [raceState, setRaceState] = useState<RaceState>("idle");
  const [lanes, setLanes] = useState<LaneState[]>(() =>
    DEFAULT_LANE_IDS.map((id) => ({
      laneId: id,
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
    })),
  );
  const [results, setResults] = useState<RaceResult[] | null>(null);

  const storedConfigs = loadRaceConfigs();
  const [configs, setConfigs] = useState<LaneConfig[]>(() =>
    DEFAULT_LANE_IDS.map((id, i) => makeInitialLane(id, storedConfigs[i])),
  );

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
      const loader = isLocal && config.baseUrl
        ? discoverLocalModels(config.baseUrl)
        : loadModels(config.providerId);
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

    // Reset lane states.
    setLanes(
      DEFAULT_LANE_IDS.map((id) => ({
        laneId: id,
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
      })),
    );

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
        onLaneFinish: (lane) => {
          if (!firstFinishPlayedRef.current && lane.finishRank === 1) {
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
    <main class="race-app">
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
                  <input
                    class="race-config-baseurl"
                    type="text"
                    placeholder="http://localhost:11434/v1"
                    value={c.baseUrl ?? ""}
                    onInput={(e) => updateLaneConfig(c.laneId, { baseUrl: (e.target as HTMLInputElement).value })}
                    aria-label={`Lane ${i + 1} base URL`}
                  />
                )}
              </div>
            );
          })}
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

      {/* Live lanes during race + after. */}
      {(raceState === "running" || raceState === "done") && (
        <RaceLanes lanes={lanes} providerNames={providerNames} />
      )}

      {/* Podium after race completes. */}
      {raceState === "done" && results && (
        <RacePodium results={results} providerNames={providerNames} laneIndexById={laneIndexById} />
      )}

      <footer class="race-footer">
        Doc Hudson says: it's not about speed, it's about consistency.
      </footer>
    </main>
  );
}
