/** @jsxImportSource preact */
import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import { providers } from "../lib/providers";
import { createMetricsTracker, type BenchmarkMetrics } from "../lib/metrics";
import { SettingsPanel, type SettingsState } from "./SettingsPanel";
import { StreamOutput } from "./StreamOutput";
import { RawResponsePanel } from "./RawResponsePanel";
import { DEFAULT_PROMPT, PROVIDERS } from "../lib/config";
import { loadModels } from "../lib/modelRegistry";
import { ErrorBoundary } from "./ErrorBoundary";
import { WeatherBackground } from "./WeatherBackground";
import { RecentRuns } from "./RecentRuns";
import { ShareBar } from "./ShareBar";
import { loadHistory, saveRun, clearHistory, type RunSummary } from "../lib/history";
import { loadPrefs, savePrefs } from "../lib/prefs";
import { CurrentSelection } from "./CurrentSelection";
import { RunControls } from "./RunControls";
import { SecondaryMetrics } from "./SecondaryMetrics";
import { HeroResult } from "./HeroResult";
import { ShowMoreToggle } from "./ShowMoreToggle";
import { TopBarActions } from "./TopBarActions";
import { BenchmarkHint } from "./BenchmarkHint";
import { HeroSparkline } from "./HeroSparkline";
import "../styles/components/BenchmarkPanel.css";

type RunState = "idle" | "running" | "done" | "error";



function BenchmarkPanelContent() {
  const prefs = loadPrefs();
  const [settings, setSettings] = useState<SettingsState>({
    providerId: prefs.providerId || "openai",
    modelId: prefs.modelId || "",
    prompt: prefs.prompt || DEFAULT_PROMPT,
    apiKey: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("iamspeed_theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
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

  const abortRef = useRef<AbortController | null>(null);
  const trackerRef = useRef<ReturnType<typeof createMetricsTracker> | null>(null);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    savePrefs({
      providerId: settings.providerId,
      modelId: settings.modelId,
      prompt: settings.prompt,
    });
  }, [settings.providerId, settings.modelId, settings.prompt]);

  // Load models on mount and ensure selected model is still valid for the provider
  useEffect(() => {
    loadModels(settings.providerId).then((models) => {
      if (models.length > 0) {
        const isValid = settings.modelId && models.some((m) => m.id === settings.modelId);
        if (!isValid) {
          setSettings((prev) => ({ ...prev, modelId: models[0].id }));
        }
      }
    });
  }, [settings.providerId]);

  const displayTps = metrics?.tokensPerSecond ?? null;
  const ttft = metrics?.ttft ?? null;
  const totalTime = metrics?.ttlt ?? null;
  const inputTokens = metrics?.inputTokens ?? null;
  const outputTokens = metrics?.outputTokens ?? null;
  const isActive = runState === "running";

  const handleRun = useCallback(async () => {
    if (!settings.apiKey || !settings.modelId) {
      setSettingsOpen(true);
      return;
    }

    setRunState("running");
    setStreamText("");
    setMetrics(null);
    setRawResponse(null);
    setError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    const tracker = createMetricsTracker(settings.providerId, settings.modelId, settings.prompt.length);
    trackerRef.current = tracker;
    tracker.start();

    const adapter = providers[settings.providerId];

    try {
      await adapter.stream({
        apiKey: settings.apiKey,
        model: settings.modelId,
        prompt: settings.prompt,
        signal: abort.signal,
        onChunk(text) {
          setStreamText((prev) => prev + text);
          tracker.recordChunk(text);
          setMetrics(tracker.getMetrics());
        },
        onFirstToken() {
          tracker.recordFirstToken();
          setMetrics(tracker.getMetrics());
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
          if (/decommissioned|no longer supported|model .* (not found|invalid)/i.test(message)) {
            loadModels(settings.providerId).then((models) => {
              if (models.length > 0) {
                const newModel = models[0];
                setSettings({ ...settings, modelId: newModel.id });
                // Friendly, non-scary message instead of raw provider text
                setError(`Model unavailable. Switched to ${newModel.label}.`);
                // Auto-clear the notice after a few seconds
                setTimeout(() => setError(null), 3500);
              } else {
                setError("Selected model is no longer available.");
              }
            });
          } else {
            setError(message);
          }

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
        if (/decommissioned|no longer supported|model .* (not found|invalid)/i.test(message)) {
          loadModels(settings.providerId).then((models) => {
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
  const hasConfig = !!settings.apiKey;

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
      <main class="llm-app">
        {/* Top bar */}
        <div class="llm-topbar">
          <span class="llm-brand">
            <span class="llm-brand-logo">
              <img src="/logo.svg" alt="I am speed" />
            </span>
            <span class="llm-brand-text">
              <h1 class="llm-brand-name">I am speed.</h1>
              <span class="llm-brand-tagline">measure what matters.</span>
            </span>
          </span>
          <TopBarActions
            onToggleTheme={toggleTheme}
            onHistory={() => setHistoryOpen(true)}
            historyOpen={historyOpen}
            onSettings={() => setSettingsOpen(true)}
            settingsOpen={settingsOpen}
          />
        </div>

        {/* Hero */}
        <div class="llm-hero">
          <HeroResult heroText={heroText} isActive={isActive} ttft={ttft} />

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

          {/* Current selection - always visible + clickable (Option B scalable UX) */}
          {settings.providerId && (
            <CurrentSelection
              providerName={PROVIDERS[settings.providerId]?.displayName || settings.providerId}
              modelId={settings.modelId || undefined}
              onClick={() => setSettingsOpen(true)}
            />
          )}

          {/* Actions */}
          <RunControls
            runState={runState}
            onRun={handleRun}
            onStop={handleStop}
          />



          <BenchmarkHint
            hasConfig={hasConfig}
            runState={runState}
            error={error}
            onOpenSettings={() => setSettingsOpen(true)}
          />

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

        <footer class="llm-footer" role="contentinfo">
          <a href="https://qainsights.com" target="_blank" rel="noopener noreferrer" aria-label="QAInsights (opens in new tab)">QAInsights</a>
          <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
          <a href="https://dosa.dev" target="_blank" rel="noopener noreferrer" aria-label="Dosa (opens in new tab)">Dosa</a>
          <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
          <a href="https://jmeter.ai" target="_blank" rel="noopener noreferrer" aria-label="JMeter.ai (opens in new tab)">JMeter.ai</a>
          <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
          <a href="https://achu.app" target="_blank" rel="noopener noreferrer" aria-label="Achu (opens in new tab)">Achu</a>
          <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
          <a href="https://github.com/qainsights/iamspeed.dev" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository (opens in new tab)">GitHub</a>
        </footer>
      </main>

      <RecentRuns
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        runs={recentRuns}
        onClear={() => { clearHistory(); setRecentRuns([]); }}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}

export function BenchmarkPanel() {
  return (
    <ErrorBoundary>
      <BenchmarkPanelContent />
    </ErrorBoundary>
  );
}
