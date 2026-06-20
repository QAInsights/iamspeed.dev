/** @jsxImportSource preact */

import { Tooltip } from "./Tooltip";

interface SecondaryMetricsProps {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTime: number | null;
  modelId: string;
}

const style = `
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
`;

export function SecondaryMetrics({ inputTokens, outputTokens, totalTime, modelId }: SecondaryMetricsProps) {
  return (
    <>
      <style>{style}</style>
      <div class="llm-secondary" role="group" aria-label="Additional metrics">
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
          <div class="llm-sec-value">{modelId}</div>
          <div class="llm-sec-label">Model</div>
        </div>
      </div>
    </>
  );
}
