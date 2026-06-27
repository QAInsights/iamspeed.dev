/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";
import { Tooltip } from "./Tooltip";
import { getSpeedGrade } from "../lib/grade";

interface HeroResultProps {
  heroText: string;
  isActive: boolean;
  ttft: number | null;
  tps?: number | null;
  // True when the provider has sent an SSE processing heartbeat (e.g.
  // OpenRouter's ": OPENROUTER PROCESSING"), indicating the request is
  // queued / being processed upstream. Overrides the cycling statuses.
  providerQueued?: boolean;
}

const style = `
  .llm-hero-number.thinking {
    background: linear-gradient(
      90deg,
      var(--text-muted) 0%,
      var(--accent) 50%,
      var(--text-muted) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 1.5s infinite linear;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .llm-hero-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding: 0.5rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    animation: fade-in 0.3s ease-out;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .llm-status-pulse {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
    position: relative;
  }
  .llm-status-pulse::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--accent);
    opacity: 0;
    animation: ring-pulse 1.5s infinite ease-out;
  }
  @keyframes ring-pulse {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .llm-grade-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.375rem 0.875rem;
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 20px;
    animation: fade-in 0.3s ease-out;
  }
  .llm-grade-emoji {
    font-size: 1.125rem;
  }
  .llm-grade-label {
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .llm-status-text {
    font-family: var(--mono);
    font-size: 0.6875rem;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

function ThinkingStatus({ isActive, ttft, providerQueued }: { isActive: boolean; ttft: number | null; providerQueued?: boolean }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Connecting to provider...",
    "Sending prompt payload...",
    "Model is thinking...",
    "Waiting for first token...",
  ];

  useEffect(() => {
    if (!isActive || ttft !== null) {
      setStatusIdx(0);
      return;
    }
    // When the provider has signalled it is queued/processing upstream,
    // stop cycling and show a single, accurate status.
    if (providerQueued) return;
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive, ttft, providerQueued]);

  const text = providerQueued ? "Queued at provider..." : statuses[statusIdx];

  return (
    <div class="llm-hero-status" role="status">
      <span class="llm-status-pulse" />
      <span class="llm-status-text">{text}</span>
    </div>
  );
}

export function HeroResult({ heroText, isActive, ttft, tps, providerQueued }: HeroResultProps) {
  const isThinking = isActive && ttft === null;
  const numberClass = `llm-hero-number${isActive ? " active" : ""}${isThinking ? " thinking" : ""}`;
  const grade = typeof tps === "number" ? getSpeedGrade(tps) : null;

  return (
    <>
      <style>{style}</style>
      <span class="llm-hero-label" id="hero-label">Your LLM speed is</span>
      <div class="llm-hero-result" aria-live="polite" aria-atomic="true" aria-describedby="hero-label">
        <span class={numberClass}>{heroText}</span>
        <span class="llm-hero-unit">tokens / sec</span>
      </div>

      {isThinking && <ThinkingStatus isActive={isActive} ttft={ttft} providerQueued={providerQueued} />}

      {ttft !== null && (
        <div class="llm-ttft">
          <div class="llm-ttft-value">{Math.round(ttft)}ms</div>
          <Tooltip label="How long before the model starts responding.">
            <div class="llm-ttft-label">First Token</div>
          </Tooltip>
        </div>
      )}

      {grade && !isActive && (
        <div class="llm-grade-badge" style={`color: ${grade.color}`}>
          <span class="llm-grade-emoji">{grade.emoji}</span>
          <span class="llm-grade-label">{grade.label}</span>
        </div>
      )}
    </>
  );
}
