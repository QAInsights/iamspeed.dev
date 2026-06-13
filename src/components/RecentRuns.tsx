/** @jsxImportSource preact */
import type { RunSummary } from "../lib/history";
import { PROVIDERS } from "../lib/config";

interface RecentRunsProps {
  open: boolean;
  onClose: () => void;
  runs: RunSummary[];
  onClear: () => void;
}

const style = `
  .llm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }
  .llm-history {
    width: 400px;
    max-width: 100vw;
    height: 100vh;
    background: var(--surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-left: 1px solid var(--border);
    padding: 2rem 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    transition: background 0.8s ease-in-out, border-color 0.3s ease-in-out;
  }
  .llm-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .llm-history-title {
    font-family: var(--mono);
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .llm-history-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .llm-history-clear {
    font-size: 0.6875rem;
    color: var(--text-muted);
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-light);
    background: var(--surface);
    cursor: pointer;
    border-radius: 0;
    transition: color 0.2s, border-color 0.2s;
  }
  .llm-history-clear:hover {
    color: #cf222e;
    border-color: #cf222e;
  }
  .llm-history-close {
    font-size: 1.25rem;
    color: var(--text-muted);
    padding: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    line-height: 1;
  }
  .llm-history-close:hover {
    color: var(--text);
  }
  .llm-history-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--mono);
    font-size: 0.75rem;
  }
  .llm-history-table thead th {
    font-size: 0.625rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .llm-history-table thead th:not(:first-child) {
    text-align: right;
  }
  .llm-history-table tbody td {
    padding: 0.625rem 0.5rem;
    color: var(--text);
    border-bottom: 1px solid var(--border-light);
    transition: color 0.3s ease-in-out;
  }
  .llm-history-table tbody tr:last-child td {
    border-bottom: none;
  }
  .llm-history-table tbody td:not(:first-child) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .llm-history-model {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .llm-history-provider {
    font-size: 0.625rem;
    color: var(--text-muted);
    margin-top: 1px;
  }
  .llm-history-tps {
    font-weight: 600;
    color: var(--accent);
  }
  .llm-history-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }
`;

function formatTps(tps: number | null): string {
  if (tps === null) return "--";
  return tps >= 100 ? tps.toFixed(0) : tps.toFixed(1);
}

function formatMs(ms: number | null): string {
  if (ms === null) return "--";
  return `${Math.round(ms)}ms`;
}

export function RecentRuns({ open, onClose, runs, onClear }: RecentRunsProps) {
  if (!open) return null;

  return (
    <>
      <style>{style}</style>
      <div class="llm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div class="llm-history">
          <div class="llm-history-header">
            <span class="llm-history-title">History</span>
            <div class="llm-history-actions">
              {runs.length > 0 && (
                <button class="llm-history-clear" onClick={onClear}>Clear All</button>
              )}
              <button class="llm-history-close" onClick={onClose}>&#x2715;</button>
            </div>
          </div>

          {runs.length === 0 ? (
            <div class="llm-history-empty">No runs yet</div>
          ) : (
            <table class="llm-history-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>TPS</th>
                  <th>TTFT</th>
                  <th>Total Time</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => (
                  <tr key={i}>
                    <td>
                      <div class="llm-history-model">{run.model}</div>
                      <div class="llm-history-provider">
                        {PROVIDERS[run.provider]?.displayName || run.provider}
                      </div>
                    </td>
                    <td class="llm-history-tps">{formatTps(run.tokensPerSecond)}</td>
                    <td>{formatMs(run.ttft)}</td>
                    <td>{formatMs(run.ttlt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
