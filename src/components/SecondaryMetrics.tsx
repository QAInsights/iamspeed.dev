/** @jsxImportSource preact */

import { Tooltip } from "./Tooltip";

import { type ModelEntry } from "../lib/modelRegistry";

interface SecondaryMetricsProps {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTime: number | null;
  model: ModelEntry | undefined;
  tps: number | null;
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

export function SecondaryMetrics({ inputTokens, outputTokens, totalTime, model, tps }: SecondaryMetricsProps) {
  const valueScore =
    tps && model?.pricing
      ? model.pricing.output === 0
        ? "∞"
        : Math.round(tps / (model.pricing.output / 1_000_000)).toLocaleString()
      : null;

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
        {valueScore !== null && (
          <div class="llm-sec-item">
            <div class="llm-sec-value">{valueScore}</div>
            <Tooltip label="Tokens per second per dollar of output, a measure of value.">
              <div class="llm-sec-label">TPS/$</div>
            </Tooltip>
          </div>
        )}
        <div class="llm-sec-item">
          <div class="llm-sec-value">{model?.id || "--"}</div>
          <div class="llm-sec-label">Model</div>
        </div>
      </div>
    </>
  );
}
