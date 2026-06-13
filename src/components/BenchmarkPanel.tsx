/** @jsxImportSource preact */
import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import { providers } from "../lib/providers";
import { createMetricsTracker, type BenchmarkMetrics } from "../lib/metrics";
import { SettingsPanel, type SettingsState } from "./SettingsPanel";
import { StreamOutput } from "./StreamOutput";
import { RawResponsePanel } from "./RawResponsePanel";
import { DEFAULT_PROMPT } from "../lib/config";
import { loadModels } from "../lib/modelRegistry";

type RunState = "idle" | "running" | "done" | "error";

const style = `
  .llm-app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  /* Top bar */
  .llm-topbar {
    width: 100%;
    max-width: var(--max-w);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 0 0;
  }
  .llm-brand {
    display: flex;
    flex-direction: column;
    gap: 0;
    line-height: 1.1;
  }
  .llm-brand-name {
    font-family: var(--body);
    font-size: 1.5rem;
    font-weight: 300;
    letter-spacing: -0.03em;
    color: var(--text);
  }
  .llm-brand-tagline {
    font-family: var(--mono);
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    margin-top: 2px;
  }
  .llm-gear {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    border: none;
    background: none;
    padding: 0;
    border-radius: 0;
  }
  .llm-gear:hover { color: var(--text); }
  .llm-gear svg { width: 18px; height: 18px; }

  /* Hero area */
  .llm-hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    width: 100%;
    max-width: var(--max-w);
  }

  .llm-hero-label {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    letter-spacing: 0.02em;
  }

  .llm-hero-number {
    font-family: var(--mono);
    font-size: 7rem;
    font-weight: 300;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--text);
    transition: color 0.2s;
  }
  .llm-hero-number.active {
    color: var(--accent);
  }
  @media (max-width: 500px) {
    .llm-hero-number { font-size: 4.5rem; }
  }

  .llm-hero-unit {
    font-family: var(--mono);
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-top: 0.75rem;
    letter-spacing: 0.05em;
  }

  /* TTFT callout */
  .llm-ttft {
    margin-top: 1.5rem;
    text-align: center;
  }
  .llm-ttft-value {
    font-family: var(--mono);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--accent);
  }
  .llm-ttft-label {
    font-size: 0.6875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.125rem;
  }

  /* Secondary metrics row */
  .llm-secondary {
    display: flex;
    gap: 2rem;
    margin-top: 2rem;
    justify-content: center;
  }
  .llm-sec-item {
    text-align: center;
  }
  .llm-sec-value {
    font-family: var(--mono);
    font-size: 1rem;
    font-weight: 500;
  }
  .llm-sec-label {
    font-size: 0.625rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.125rem;
  }

  /* Actions row */
  .llm-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 2.5rem;
    align-items: center;
  }
  .llm-btn-run {
    padding: 0.625rem 2rem;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    font-size: 0.8125rem;
    letter-spacing: 0.02em;
    border: none;
    cursor: pointer;
    border-radius: 0;
  }
  .llm-btn-run:hover { background: var(--accent-hover); }
  .llm-btn-run:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .llm-btn-stop {
    padding: 0.625rem 2rem;
    border: 1px solid var(--border);
    background: var(--surface);
    font-weight: 500;
    font-size: 0.8125rem;
    cursor: pointer;
    color: var(--text);
    border-radius: 0;
  }
  .llm-btn-stop:hover { border-color: var(--text); }

  /* Show more toggle */
  .llm-show-more {
    margin-top: 2rem;
    font-size: 0.75rem;
    color: var(--accent);
    cursor: pointer;
    background: none;
    border: none;
    letter-spacing: 0.02em;
    font-family: var(--body);
  }
  .llm-show-more:hover { text-decoration: underline; }

  /* Stream section */
  .llm-stream-section {
    width: 100%;
    max-width: var(--max-w);
    padding: 0 0 2rem;
  }

  /* Error */
  .llm-error {
    color: #cf222e;
    font-size: 0.8125rem;
    margin-top: 1rem;
    text-align: center;
    max-width: var(--max-w);
  }

  /* No-key hint */
  .llm-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 1rem;
    text-align: center;
  }
  .llm-hint a {
    color: var(--accent);
    cursor: pointer;
  }
`;

export function BenchmarkPanel() {
  const [settings, setSettings] = useState<SettingsState>({
    providerId: "openai",
    modelId: "",
    prompt: DEFAULT_PROMPT,
    apiKey: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [streamText, setStreamText] = useState("");
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [rawResponse, setRawResponse] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const trackerRef = useRef<ReturnType<typeof createMetricsTracker> | null>(null);

  // Load models on mount
  useEffect(() => {
    loadModels("openai").then((models) => {
      if (models.length > 0) {
        setSettings((prev) => ({ ...prev, modelId: models[0].id }));
      }
    });
  }, []);

  const displayTps = metrics?.tokensPerSecond ?? null;
  const ttft = metrics?.ttft ?? null;
  const tokenCount = metrics?.tokenCount ?? 0;
  const totalTime = metrics?.totalTime ?? null;
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
        onDone(raw) {
          tracker.finish();
          setMetrics(tracker.getMetrics());
          setRawResponse(raw);
          setRunState("done");
        },
        onError(err) {
          tracker.finish();
          setMetrics(tracker.getMetrics());
          setError(err.message);
          setRunState("error");
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
      setMetrics(trackerRef.current.getMetrics());
    }
    setRunState("done");
  }, []);

  const heroText = displayTps !== null ? String(displayTps) : "--";
  const hasConfig = !!settings.apiKey;

  return (
    <>
      <style>{style}</style>
      <div class="llm-app">
        {/* Top bar */}
        <div class="llm-topbar">
          <span class="llm-brand">
            <span class="llm-brand-name">I am speed.</span>
            <span class="llm-brand-tagline">measure what matters.</span>
          </span>
          <button class="llm-gear" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Hero */}
        <div class="llm-hero">
          <span class="llm-hero-label">Your LLM speed is</span>
          <span class={`llm-hero-number${isActive ? " active" : ""}`}>{heroText}</span>
          <span class="llm-hero-unit">tokens / sec</span>

          {/* TTFT */}
          {ttft !== null && (
            <div class="llm-ttft">
              <div class="llm-ttft-value">{Math.round(ttft)}</div>
              <div class="llm-ttft-label">First Token (ms)</div>
            </div>
          )}

          {/* Secondary metrics */}
          {(runState === "done" || runState === "running") && showMore && (
            <div class="llm-secondary">
              <div class="llm-sec-item">
                <div class="llm-sec-value">{tokenCount > 0 ? tokenCount : "--"}</div>
                <div class="llm-sec-label">Tokens</div>
              </div>
              <div class="llm-sec-item">
                <div class="llm-sec-value">{totalTime !== null ? `${Math.round(totalTime)}ms` : "--"}</div>
                <div class="llm-sec-label">Total Time</div>
              </div>
              <div class="llm-sec-item">
                <div class="llm-sec-value">{settings.modelId}</div>
                <div class="llm-sec-label">Model</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div class="llm-actions">
            {runState !== "running" ? (
              <button
                class="llm-btn-run"
                onClick={handleRun}
                disabled={runState === "running"}
              >
                {runState === "idle" ? "Run" : "Run Again"}
              </button>
            ) : (
              <button class="llm-btn-stop" onClick={handleStop}>Stop</button>
            )}
          </div>

          {!hasConfig && runState === "idle" && (
            <p class="llm-hint">
              Click <a onClick={() => setSettingsOpen(true)}>Settings</a> to configure your API key
            </p>
          )}

          {/* Show more */}
          {(runState === "done" || runState === "running") && (
            <button class="llm-show-more" onClick={() => setShowMore((v) => !v)}>
              {showMore ? "Show less" : "Show more info"}
            </button>
          )}

          {error && <div class="llm-error">{error}</div>}
        </div>

        {/* Stream output section */}
        {(streamText || isActive) && (
          <div class="llm-stream-section">
            <StreamOutput text={streamText} streaming={isActive} />
            {runState === "done" && <RawResponsePanel data={rawResponse} />}
          </div>
        )}
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}
