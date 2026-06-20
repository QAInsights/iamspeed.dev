/** @jsxImportSource preact */

interface CurrentSelectionProps {
  providerName: string;
  modelId?: string;
  onClick: () => void;
}

const style = `
  .llm-current-selection {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.75rem;
    text-align: center;
    cursor: pointer;
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
    opacity: 0.6;
    font-size: 0.6875rem;
    margin-left: 0.375rem;
  }
`;

export function CurrentSelection({ providerName, modelId, onClick }: CurrentSelectionProps) {
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
        <span class="change">change</span>
      </div>
    </>
  );
}
