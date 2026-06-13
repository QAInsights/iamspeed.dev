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
import { Sparkline } from "./Sparkline";
import { ShareBar } from "./ShareBar";
import { Tooltip } from "./Tooltip";
import { loadHistory, saveRun, clearHistory, type RunSummary } from "../lib/history";
import "../styles/components/BenchmarkPanel.css";

type RunState = "idle" | "running" | "done" | "error";

const PREFS_KEY = "iamspeed_prefs";

interface Prefs {
  providerId?: string;
  modelId?: string;
  prompt?: string;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

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

  // Load models on mount, only overriding modelId if nothing persisted
  useEffect(() => {
    loadModels(settings.providerId).then((models) => {
      if (models.length > 0 && !settings.modelId) {
        setSettings((prev) => ({ ...prev, modelId: models[0].id }));
      }
    });
  }, []);

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
          setError(err.message);
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
        setError(err instanceof Error ? err.message : String(err));
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
          <div class="llm-topbar-actions">
            <button class="llm-theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="theme-toggle-icon">
                <path class="sun-icon" d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42" />
                <path class="moon-icon" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
            <button class="llm-history-btn" onClick={() => setHistoryOpen(true)} aria-label="History">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            </button>
            <button class="llm-gear" onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero */}
        <div class="llm-hero">
          <span class="llm-hero-label">Your LLM speed is</span>
          <span class={`llm-hero-number${isActive ? " active" : ""}`}>{heroText}</span>
          <span class="llm-hero-unit">tokens / sec</span>

          {/* TTFT */}
          {ttft !== null && (
            <div class="llm-ttft">
              <div class="llm-ttft-value">{Math.round(ttft)}ms</div>
              <Tooltip label="How long before the model starts responding.">
                <div class="llm-ttft-label">First Token</div>
              </Tooltip>
            </div>
          )}

          {/* Compact sparkline for recent runs */}
          {sparklineData.length > 1 && (
            <div class="llm-hero-sparkline">
              <Sparkline data={sparklineData} width={240} height={48} strokeWidth={1.5} />
            </div>
          )}

          {/* Secondary metrics */}
          {(runState === "done" || runState === "running") && showMore && (
            <div class="llm-secondary">
              <div class="llm-sec-item">
                <div class="llm-sec-value">{inputTokens !== null ? inputTokens : "--"}</div>
                <div class="llm-sec-label">Input</div>
              </div>
              <div class="llm-sec-item">
                <div class="llm-sec-value">{outputTokens !== null ? outputTokens : "--"}</div>
                <div class="llm-sec-label">Output</div>
              </div>
              <div class="llm-sec-item">
                <div class="llm-sec-value">{totalTime !== null ? `${Math.round(totalTime)}ms` : "--"}</div>
                <Tooltip label="Total duration from request to complete response.">
                  <div class="llm-sec-label">TTLT</div>
                </Tooltip>
              </div>
              <div class="llm-sec-item">
                <div class="llm-sec-value">{settings.modelId}</div>
                <div class="llm-sec-label">Model</div>
              </div>
            </div>
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

          {/* Actions */}
          <div class="llm-actions">
            {runState !== "running" ? (
              <button
                class="llm-btn-run"
                onClick={handleRun}
              >
                {runState === "idle" ? "Run" : "Run Again"}
              </button>
            ) : (
              <button class="llm-btn-stop" onClick={handleStop}>Stop</button>
            )}
          </div>

          {/* Model context */}
          {(runState === "done" || runState === "running") && settings.modelId && (
            <div class="llm-model-context">
              {settings.modelId} · {PROVIDERS[settings.providerId]?.displayName || settings.providerId}
            </div>
          )}

          {!hasConfig && runState === "idle" && (
            <p class="llm-hint">
              Click <a onClick={() => setSettingsOpen(true)}>Settings</a> to configure your API key
            </p>
          )}

          {/* Show more */}
          {(runState === "done" || runState === "running") && (
            <button class="llm-show-more" onClick={() => setShowMore((v) => !v)}>
              {showMore ? "Less metrics" : "More metrics"}
            </button>
          )}

          {error && <div class="llm-error">{error}</div>}
        </div>

        {/* Stream output section */}
        {(streamText || isActive) && showMore && (
          <div class="llm-stream-section">
            <StreamOutput text={streamText} streaming={isActive} />
            {runState === "done" && <RawResponsePanel data={rawResponse} />}
          </div>
        )}

        <footer class="llm-footer">
          <a href="https://qainsights.com" target="_blank" rel="noopener noreferrer">QAInsights</a>
          <span class="llm-footer-dot">&middot;</span>
          <a href="https://dosa.dev" target="_blank" rel="noopener noreferrer">Dosa</a>
          <span class="llm-footer-dot">&middot;</span>
          <a href="https://jmeter.ai" target="_blank" rel="noopener noreferrer">JMeter.ai</a>
          <span class="llm-footer-dot">&middot;</span>
          <a href="https://achu.app" target="_blank" rel="noopener noreferrer">Achu</a>
          <span class="llm-footer-dot">&middot;</span>
          <a href="https://github.com/qainsights/iamspeed.dev" target="_blank" rel="noopener noreferrer">GitHub</a>
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
