/** @jsxImportSource preact */

interface BenchmarkHintProps {
  hasConfig: boolean;
  runState: string;
  error: string | null;
  onOpenSettings: () => void;
}

const style = `
  .llm-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 1rem;
    text-align: center;
  }
  .llm-hint-link {
    color: var(--accent);
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    text-decoration: underline;
    display: inline;
  }
  .llm-error {
    color: #f59e0b; /* softer amber for model/provider notices */
    font-size: 0.75rem;
    margin-top: 0.75rem;
    text-align: center;
    max-width: var(--max-w);
    opacity: 0.9;
  }
`;

export function BenchmarkHint({ hasConfig, runState, error, onOpenSettings }: BenchmarkHintProps) {
  return (
    <>
      <style>{style}</style>
      {!hasConfig && runState === "idle" && (
        <p class="llm-hint">
          Click <button class="llm-hint-link" onClick={onOpenSettings}>Settings</button> to choose a provider and API key
        </p>
      )}
      {error && <div class="llm-error" role="alert">{error}</div>}
    </>
  );
}
