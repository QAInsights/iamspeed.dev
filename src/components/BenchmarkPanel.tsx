/** @jsxImportSource preact */
import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import { providers, createOpenAICompatibleAdapter, normalizeBaseURL } from "../lib/providers";
import { createMetricsTracker, type BenchmarkMetrics } from "../lib/metrics";
import { SettingsPanel, type SettingsState } from "./SettingsPanel";
import { StreamOutput } from "./StreamOutput";
import { RawResponsePanel } from "./RawResponsePanel";
import { DEFAULT_PROMPT, PROVIDERS, LOCAL_PROVIDER_ID } from "../lib/config";
import { loadModels, discoverLocalModels } from "../lib/modelRegistry";
import { ErrorBoundary } from "./ErrorBoundary";
import { WeatherBackground } from "./WeatherBackground";
import { RecentRuns } from "./RecentRuns";
import { ShareBar } from "./ShareBar";
import { LeaderboardSubmit } from "./LeaderboardSubmit";
import { loadHistory, saveRun, clearHistory, type RunSummary } from "../lib/history";
import { loadPrefs, savePrefs } from "../lib/prefs";
import { CurrentSelection } from "./CurrentSelection";
import { RunControls } from "./RunControls";
import { SecondaryMetrics } from "./SecondaryMetrics";
import { HeroResult } from "./HeroResult";
import { ShowMoreToggle } from "./ShowMoreToggle";
import { TopBar } from "./TopBar";
import { BenchmarkHint } from "./BenchmarkHint";
import { HeroSparkline } from "./HeroSparkline";
import { playTick } from "../lib/audio";
import { loadMode, saveMode, type AppMode } from "../lib/race/storage";
import { RacePanel } from "./race/RacePanel";
import { Footer } from "./Footer";
import { CarSilhouette } from "./CarSilhouette";
import "../styles/components/BenchmarkPanel.css";

type RunState = "idle" | "running" | "done" | "error";



function BenchmarkPanelContent({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const prefs = loadPrefs();
  const [settings, setSettings] = useState<SettingsState>({
    providerId: prefs.providerId || "openai",
    modelId: prefs.modelId || "",
    prompt: prefs.prompt || DEFAULT_PROMPT,
    apiKey: null,
    baseUrl: prefs.baseUrl,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }
    return "light";
  });
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>(() => loadMode());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("iamspeed_sound") !== "false";
    }
    return true;
  });

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleOpenHistory = useCallback(() => {
    setHistoryOpen(true);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "race" ? "simple" : "race";
      saveMode(next);
      return next;
    });
  }, []);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("iamspeed_sound", String(next));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("iamspeed_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, [theme]);
  const [streamText, setStreamText] = useState("");
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [rawResponse, setRawResponse] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [providerQueued, setProviderQueued] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const trackerRef = useRef<ReturnType<typeof createMetricsTracker> | null>(null);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    savePrefs({
      providerId: settings.providerId,
      modelId: settings.modelId,
      prompt: settings.prompt,
      baseUrl: settings.baseUrl,
    });
  }, [settings.providerId, settings.modelId, settings.prompt, settings.baseUrl]);

  // Load models on mount and ensure selected model is still valid for the provider
  useEffect(() => {
    const isLocal = settings.providerId === LOCAL_PROVIDER_ID;
    const loader = isLocal && settings.baseUrl
      ? discoverLocalModels(settings.baseUrl)
      : loadModels(settings.providerId, settings.apiKey || undefined);

    loader.then((models) => {
      if (models.length > 0) {
        const isValid = settings.modelId && models.some((m) => m.id === settings.modelId);
        if (!isValid) {
          setSettings((prev) => ({ ...prev, modelId: models[0].id }));
        }
      }
    });
  }, [settings.providerId, settings.baseUrl, settings.apiKey]);



  const displayTps = metrics?.tokensPerSecond ?? null;
  const ttft = metrics?.ttft ?? null;
  const totalTime = metrics?.ttlt ?? null;
  const inputTokens = metrics?.inputTokens ?? null;
  const outputTokens = metrics?.outputTokens ?? null;
  const isActive = runState === "running";

  const handleRun = useCallback(async () => {
    const isLocal = settings.providerId === LOCAL_PROVIDER_ID;
    const hasRequired = isLocal
      ? !!settings.baseUrl && !!settings.modelId
      : !!settings.apiKey && !!settings.modelId;

    if (!hasRequired) {
      setSettingsOpen(true);
      return;
    }

    setRunState("running");
    setStreamText("");
    setMetrics(null);
    setRawResponse(null);
    setError(null);
    setProviderQueued(false);

    const abort = new AbortController();
    abortRef.current = abort;

    const tracker = createMetricsTracker(settings.providerId, settings.modelId, settings.prompt.length);
    trackerRef.current = tracker;
    tracker.start();

    const adapter = isLocal && settings.baseUrl
      ? createOpenAICompatibleAdapter(normalizeBaseURL(settings.baseUrl), LOCAL_PROVIDER_ID, "Local")
      : providers[settings.providerId];

    const recoverModelSelection = (message: string) => {
      if (/decommissioned|no longer supported|model .* (not found|invalid)/i.test(message)) {
        const recover = isLocal && settings.baseUrl
          ? discoverLocalModels(settings.baseUrl)
          : loadModels(settings.providerId, settings.apiKey || undefined);
        recover.then((models) => {
          if (models.length > 0) {
            const newModel = models[0];
            setSettings({ ...settings, modelId: newModel.id });
            setError(`Model unavailable. Switched to ${newModel.label}.`);
            setTimeout(() => setError(null), 3500);
          } else {
            setError("Selected model is no longer available.");
          }
        });
      } else {
        setError(message);
      }
    };

    try {
      await adapter.stream({
        apiKey: settings.apiKey || "",
        model: settings.modelId,
        prompt: settings.prompt,
        signal: abort.signal,
        onChunk(text) {
          setStreamText((prev) => prev + text);
          tracker.recordChunk(text);
          const currentMetrics = tracker.getMetrics();
          setMetrics(currentMetrics);
          if (soundEnabledRef.current) {
            playTick(currentMetrics.tokensPerSecond ?? undefined);
          }
        },
        onFirstToken() {
          tracker.recordFirstToken();
          const currentMetrics = tracker.getMetrics();
          setMetrics(currentMetrics);
          setProviderQueued(false);
          if (soundEnabledRef.current) {
            playTick(currentMetrics.tokensPerSecond ?? undefined);
          }
        },
        onProcessing() {
          setProviderQueued(true);
        },
        onUsage(usage) {
          tracker.recordUsage(usage.inputTokens, usage.outputTokens);
          setMetrics(tracker.getMetrics());
        },
        onDone(raw) {
          tracker.finish();
          const finalMetrics = tracker.getMetrics();
          setMetrics(finalMetrics);
          setRawResponse(raw);
          if (finalMetrics.tokenCount === 0) {
            setError("No tokens were generated by the model. Please check your configuration or try again.");
            setRunState("error");
            return;
          }
          setRunState("done");
          const updated = saveRun({
            model: settings.modelId,
            provider: settings.providerId,
            tokensPerSecond: finalMetrics.tokensPerSecond,
            ttft: finalMetrics.ttft,
            ttlt: finalMetrics.ttlt,
            inputTokens: finalMetrics.inputTokens,
            outputTokens: finalMetrics.outputTokens,
            timestamp: Date.now(),
          });
          setRecentRuns(updated);
        },
        onError(err) {
          tracker.finish();
          const finalMetrics = tracker.getMetrics();
          setMetrics(finalMetrics);

          const message = err.message || String(err);

          // Subtle handling for decommissioned / invalid models: auto-recover
          recoverModelSelection(message);

          setRunState("error");

          if (finalMetrics.tokenCount > 0) {
            const updated = saveRun({
              model: settings.modelId,
              provider: settings.providerId,
              tokensPerSecond: finalMetrics.tokensPerSecond,
              ttft: finalMetrics.ttft,
              ttlt: finalMetrics.ttlt,
              inputTokens: finalMetrics.inputTokens,
              outputTokens: finalMetrics.outputTokens,
              timestamp: Date.now(),
            });
            setRecentRuns(updated);
          }
        },
      });
    } catch (err) {
      if (!abort.signal.aborted) {
        const message = err instanceof Error ? err.message : String(err);
        // Same subtle recovery for model errors from the outer catch
        recoverModelSelection(message);
        setRunState("error");
      }
    }
  }, [settings]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    trackerRef.current?.finish();
    if (trackerRef.current) {
      const finalMetrics = trackerRef.current.getMetrics();
      setMetrics(finalMetrics);
      if (finalMetrics.tokenCount > 0) {
        const updated = saveRun({
          model: settings.modelId,
          provider: settings.providerId,
          tokensPerSecond: finalMetrics.tokensPerSecond,
          ttft: finalMetrics.ttft,
          ttlt: finalMetrics.ttlt,
          inputTokens: finalMetrics.inputTokens,
          outputTokens: finalMetrics.outputTokens,
          timestamp: Date.now(),
        });
        setRecentRuns(updated);
      }
    }
    setRunState("done");
  }, [settings.modelId, settings.providerId]);

  const heroText = displayTps !== null ? String(displayTps) : "--";
  const sparklineData = recentRuns
    .filter((r) => r.tokensPerSecond !== null)
    .map((r) => ({
      value: r.tokensPerSecond!,
      label: r.model.includes("/") ? r.model.split("/").slice(1).join("/") : r.model,
    }))
    .reverse();

  return (
    <>
      <WeatherBackground theme={theme} />
      <main class={`llm-app mode-${mode}`}>
        <TopBar
          onToggleTheme={toggleTheme}
          onHistory={handleOpenHistory}
          historyOpen={historyOpen}
          onSettings={handleOpenSettings}
          settingsOpen={settingsOpen}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          mode={mode}
          onToggleMode={toggleMode}
          showHistory={mode === "simple"}
        />

        {mode === "race" ? (
          <RacePanel soundEnabled={soundEnabled} showFooter={false} />
        ) : (
          <>
            {/* Hero */}
            <div class="llm-hero">
              <HeroResult heroText={heroText} isActive={isActive} ttft={ttft} tps={displayTps} providerQueued={providerQueued} />

              {/* Compact sparkline for recent runs */}
              <HeroSparkline data={sparklineData} />

              {/* Secondary metrics */}
              {(runState === "done" || runState === "running") && showMore && (
                <SecondaryMetrics
                  inputTokens={inputTokens}
                  outputTokens={outputTokens}
                  totalTime={totalTime}
                  modelId={settings.modelId}
                />
              )}

              {/* Share bar — only when results are available */}
              {runState === "done" && metrics && (
                <ShareBar
                  provider={PROVIDERS[settings.providerId]?.displayName || settings.providerId}
                  model={settings.modelId}
                  tps={displayTps}
                  ttft={ttft}
                />
              )}

              {/* Submit to leaderboard — only in simple mode after a run */}
              {mode === "simple" && runState === "done" && metrics && (
                <LeaderboardSubmit
                  provider={settings.providerId}
                  model={settings.modelId}
                  tps={displayTps}
                  ttft={ttft}
                  ttlt={totalTime}
                  siteKey={turnstileSiteKey}
                />
              )}

              {/* Current selection - always visible + clickable (Option B scalable UX) */}
              {settings.providerId && (
                <CurrentSelection
                  providerName={PROVIDERS[settings.providerId]?.displayName || settings.providerId}
                  modelId={settings.modelId || undefined}
                  onClick={handleOpenSettings}
                />
              )}

              {/* Actions */}
              <RunControls
                runState={runState}
                onRun={handleRun}
                onStop={handleStop}
              />



              <BenchmarkHint error={error} />

              {/* Show more */}
              {(runState === "done" || runState === "running") && (
                <ShowMoreToggle
                  showMore={showMore}
                  onToggle={() => setShowMore((v) => !v)}
                />
              )}

            </div>

            {/* Stream output section */}
            {(streamText || isActive) && showMore && (
              <div class="llm-stream-section">
                <StreamOutput text={streamText} streaming={isActive} />
                {runState === "done" && <RawResponsePanel data={rawResponse} />}
              </div>
            )}
          </>
        )}

        {/* Futuristic Car Silhouette & Footer wrapper to maintain bottom alignment in block flow */}
        <div class="llm-footer-wrap">
          <CarSilhouette animating={isActive} />
          <Footer mode={mode} />
        </div>
      </main>

      {mode === "simple" && (
        <RecentRuns
          open={historyOpen}
          onClose={handleCloseHistory}
          runs={recentRuns}
          onClear={() => { clearHistory(); setRecentRuns([]); }}
        />
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={handleCloseSettings}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}

export function BenchmarkPanel({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  return (
    <ErrorBoundary>
      <BenchmarkPanelContent turnstileSiteKey={turnstileSiteKey} />
    </ErrorBoundary>
  );
}
