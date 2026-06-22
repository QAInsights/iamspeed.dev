/** @jsxImportSource preact */

interface ApiKeyFieldProps {
  providerId: string;
  value: string;
  stored: boolean;
  onInput: (val: string) => void;
  onBlur: () => void;
  onClear: () => void;
}

const style = `
  .llm-key-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .llm-key-row input {
    flex: 1;
    font-family: var(--mono);
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0;
  }
  .llm-key-indicator {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .llm-key-indicator svg {
    width: 16px;
    height: 16px;
  }
  .llm-key-clear {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-light);
    background: var(--surface);
    cursor: pointer;
    border-radius: 0;
  }
  .llm-key-clear:hover {
    color: #cf222e;
    border-color: #cf222e;
  }
  .llm-key-status {
    font-size: 0.75rem;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.375rem;
    padding: 0.25rem 0.5rem;
    background: var(--bg);
    border: 1px solid var(--border-light);
    border-radius: 4px;
    line-height: 1.3;
  }
`;

export function ApiKeyField({
  providerId,
  value,
  stored,
  onInput,
  onBlur,
  onClear,
}: ApiKeyFieldProps) {
  return (
    <>
      <style>{style}</style>
      <div class="llm-key-row">
        <input
          id="settings-apikey"
          type="password"
          placeholder={`${providerId} API key`}
          value={value}
          onInput={(e) => onInput((e.target as HTMLInputElement).value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={`${providerId} API key`}
        />
        {stored && (
          <>
            <span class="llm-key-indicator" aria-label="API key encrypted and stored locally">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text)" stroke-width="1.5" aria-hidden="true">
                <rect x="3" y="7" width="10" height="7" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" />
              </svg>
            </span>
            <button class="llm-key-clear" onClick={onClear} aria-label="Clear stored API key">
              &#x2715;
            </button>
          </>
        )}
      </div>
      {stored && (
        <div class="llm-key-status" aria-live="polite">
          <span aria-hidden="true">🔒</span> Your key is encrypted locally. Never leaves this device.
        </div>
      )}
    </>
  );
}
