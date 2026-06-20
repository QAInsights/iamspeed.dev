/** @jsxImportSource preact */
import { useEffect, useRef } from "preact/hooks";
import type { BenchmarkMetrics } from "../lib/metrics";
import { Tooltip } from "./Tooltip";
import { slotText, chromatic, type SlotTextController } from "slot-text";
import "slot-text/style.css";

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
    display: inline-block;
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

const odometerOptions = {
  direction: "up" as const,
  stagger: 30,
  duration: 250,
  bounce: 0.4,
  skipUnchanged: true,
};

interface OdometerMetricProps {
  value: string | number | null;
  accent?: boolean;
}

function OdometerMetric({ value, accent }: OdometerMetricProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<SlotTextController | null>(null);
  const text = value === null || value === undefined ? "--" : String(value);
  const prevTextRef = useRef<string>(text);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    controllerRef.current = slotText(el, text, odometerOptions);
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (controllerRef.current) {
      const isNewUpdate = text !== "--" && text !== prevTextRef.current;
      prevTextRef.current = text;
      controllerRef.current.set(text, {
        ...odometerOptions,
        ...(isNewUpdate ? { color: chromatic() } : {}),
      });
    }
  }, [text]);

  return (
    <span
      ref={elRef}
      class={`llm-metric-value${accent ? " accent" : ""}`}
      aria-label={text}
    >
      {text}
    </span>
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
      <div class="llm-metrics" role="group" aria-label="Benchmark metrics">
        <div class="llm-metric">
          <OdometerMetric value={ttft !== null ? formatNumber(ttft) : null} accent />
          <span class="llm-metric-unit">ms</span>
          <Tooltip label="How long before the model starts responding.">
            <div class="llm-metric-label">First Token</div>
          </Tooltip>
        </div>
        <div class="llm-metric">
          <OdometerMetric value={tps !== null ? formatNumber(tps) : null} />
          <span class="llm-metric-unit"> tok/s</span>
          <Tooltip label="Tokens Per Second. Output generation speed.">
            <div class="llm-metric-label">Throughput</div>
          </Tooltip>
        </div>
        <div class="llm-metric">
          <OdometerMetric value={tokens > 0 ? tokens : null} />
          <div class="llm-metric-label">Tokens</div>
        </div>
        <div class="llm-metric">
          <OdometerMetric value={total !== null ? formatNumber(total) : null} />
          <span class="llm-metric-unit">ms</span>
          <Tooltip label="Time to Last Token. Total duration from request to complete response.">
            <div class="llm-metric-label">Total Time</div>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
