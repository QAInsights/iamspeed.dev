/** @jsxImportSource preact */

interface RunControlsProps {
  runState: "idle" | "running" | "done" | "error";
  onRun: () => void;
  onStop: () => void;
}

const style = `
  .llm-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 2.5rem;
    align-items: center;
    cursor: pointer;
  }
  .llm-btn-run {
    padding: 0.625rem 2.25rem;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    font-size: 0.8125rem;
    letter-spacing: 0.02em;
    border: none;
    cursor: pointer;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
  }
  .llm-btn-run:hover {
    background: var(--accent-hover);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
  }
  .llm-btn-run:active {
    transform: scale(0.96);
  }
  .llm-btn-run:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    box-shadow: none;
  }
  .llm-btn-stop {
    padding: 0.625rem 2.25rem;
    border: 1px solid var(--border);
    background: var(--surface);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-weight: 500;
    font-size: 0.8125rem;
    cursor: pointer;
    color: var(--text);
    border-radius: 6px;
    transition: border-color 0.2s, background-color 0.2s, color 0.2s, transform 0.1s;
  }
  .llm-btn-stop:hover {
    border-color: var(--text);
    background: var(--border-light);
  }
  .llm-btn-stop:active {
    transform: scale(0.96);
  }
`;

export function RunControls({ runState, onRun, onStop }: RunControlsProps) {
  return (
    <>
      <style>{style}</style>
      <div class="llm-actions">
        {runState !== "running" ? (
          <button
            class="llm-btn-run"
            onClick={onRun}
          >
            {runState === "idle" ? "Run" : "Run Again"}
          </button>
        ) : (
          <button class="llm-btn-stop" onClick={onStop}>Stop</button>
        )}
      </div>
    </>
  );
}
