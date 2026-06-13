/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import type { BenchmarkMetrics } from "../lib/metrics";
import { Tooltip } from "./Tooltip";

interface MetricsDisplayProps {
  metrics: BenchmarkMetrics | null;
}

const style = `
  .llm-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background: var(--border-light);
    border: 1px solid var(--border-light);
    margin-top: var(--rhythm);
  }
  @media (min-width: 600px) {
    .llm-metrics { grid-template-columns: repeat(4, 1fr); }
  }
  .llm-metric {
    background: var(--surface);
    padding: 1rem;
    text-align: center;
  }
  .llm-metric-value {
    font-family: var(--mono);
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.2;
  }
  .llm-metric-value.accent {
    color: var(--accent);
  }
  .llm-metric-unit {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: var(--mono);
  }
  .llm-metric-label {
    font-size: 0.6875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }
`;

function formatNumber(n: number | null): string {
  if (n === null) return "--";
  if (n >= 1000) return n.toFixed(0);
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(1);
}

function AnimatedNumber({ value, accent }: { value: number | null; accent?: boolean }) {
  const [display, setDisplay] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const duration = 600;

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      return;
    }

    const target = value;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased * 10) / 10);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const text = display === null ? "--" : formatNumber(display);

  return (
    <span class={`llm-metric-value${accent ? " accent" : ""}`}>{text}</span>
  );
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  const ttft = metrics?.ttft ?? null;
  const tps = metrics?.tokensPerSecond ?? null;
  const tokens = metrics?.tokenCount ?? 0;
  const total = metrics?.ttlt ?? null;

  return (
    <>
      <style>{style}</style>
      <div class="llm-metrics">
        <div class="llm-metric">
          <AnimatedNumber value={ttft} accent />
          <span class="llm-metric-unit">ms</span>
          <Tooltip label="How long before the model starts responding.">
            <div class="llm-metric-label">First Token</div>
          </Tooltip>
        </div>
        <div class="llm-metric">
          <span class="llm-metric-value">{formatNumber(tps)}</span>
          <span class="llm-metric-unit"> tok/s</span>
          <Tooltip label="Tokens Per Second. Output generation speed.">
            <div class="llm-metric-label">Throughput</div>
          </Tooltip>
        </div>
        <div class="llm-metric">
          <span class="llm-metric-value">{tokens > 0 ? tokens : "--"}</span>
          <div class="llm-metric-label">Tokens</div>
        </div>
        <div class="llm-metric">
          <span class="llm-metric-value">{formatNumber(total)}</span>
          <span class="llm-metric-unit">ms</span>
          <Tooltip label="Time to Last Token. Total duration from request to complete response.">
            <div class="llm-metric-label">Total Time</div>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
