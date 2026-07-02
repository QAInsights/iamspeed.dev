/** @jsxImportSource preact */

import { type ModelEntry } from "../lib/modelRegistry";

interface CurrentSelectionProps {
  providerName: string;
  model?: ModelEntry;
  onClick: () => void;
}

const style = `
  .llm-current-selection {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.75rem;
    text-align: center;
    cursor: default;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .llm-current-selection:hover {
    background: var(--border-light);
    color: var(--text);
  }
  .llm-current-selection .provider {
    color: var(--text);
    font-weight: 500;
  }
  .llm-current-selection .change {
    display: inline-block;
    opacity: 0.6;
    font-size: 0.6875rem;
    margin-left: 0.375rem;
    cursor: pointer;
    transition: opacity 0.15s ease, color 0.15s ease;
  }
  .llm-current-selection .change:hover {
    opacity: 1;
    color: var(--accent);
    text-decoration: underline;
  }
  .llm-current-selection .pricing {
    opacity: 0.6;
  }
`;

export function CurrentSelection({ providerName, model, onClick }: CurrentSelectionProps) {
  const modelId = model?.id;
  const pricing = model?.pricing;
  const isFree = pricing && pricing.input === 0 && pricing.output === 0;
  const hasPricing = pricing && (pricing.input > 0 || pricing.output > 0);

  return (
    <>
      <style>{style}</style>
      <div
        class="llm-current-selection"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={`Current selection: ${providerName}${modelId ? " " + modelId : ""}. Click or press Enter to change.`}
      >
        <span class="provider">{providerName}</span>
        {modelId && <span> · {modelId}</span>}
        {isFree && (
          <span class="pricing"> · Free</span>
        )}
        {!isFree && hasPricing && (
          <span class="pricing">
            {" "}· ${pricing.input.toFixed(2)} / ${pricing.output.toFixed(2)}
          </span>
        )}
        {!pricing && modelId && (
          <span class="pricing"> · No pricing</span>
        )}
        <span class="change">change</span>
      </div>
    </>
  );
}
