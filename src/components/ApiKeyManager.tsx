/** @jsxImportSource preact */
import { useState, useEffect, useCallback } from "preact/hooks";
import { saveKey, loadKey, clearKey, hasStoredKey } from "../lib/crypto";

interface ApiKeyManagerProps {
  provider: string;
  onKeyChange: (key: string | null) => void;
}

const style = `
  .llm-apikey {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: var(--rhythm);
  }
  .llm-apikey input {
    flex: 1;
    font-family: var(--mono);
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
  }
  .llm-apikey-indicator {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .llm-apikey-indicator svg {
    width: 16px;
    height: 16px;
  }
  .llm-apikey-clear {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-light);
    background: var(--surface);
    cursor: pointer;
  }
  .llm-apikey-clear:hover {
    color: #cf222e;
    border-color: #cf222e;
  }
  .llm-apikey-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

export function ApiKeyManager({ provider, onKeyChange }: ApiKeyManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [stored, setStored] = useState(false);

  useEffect(() => {
    setStored(hasStoredKey(provider));
    setInputValue("");

    loadKey(provider).then((key) => {
      if (key) {
        setInputValue(key);
        onKeyChange(key);
      }
    });
  }, [provider]);

  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) return;
    await saveKey(provider, inputValue.trim());
    setStored(true);
    onKeyChange(inputValue.trim());
  }, [provider, inputValue, onKeyChange]);

  const handleClear = useCallback(() => {
    clearKey(provider);
    setStored(false);
    setInputValue("");
    onKeyChange(null);
  }, [provider, onKeyChange]);

  const handleInput = useCallback((e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    setInputValue(val);
    onKeyChange(val.trim() || null);
  }, [onKeyChange]);

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      handleSave();
    }
  }, [inputValue, handleSave]);

  return (
    <>
      <style>{style}</style>
      <div class="llm-apikey">
        <label for={`apikey-${provider}`} class="llm-apikey-label">
          {provider} API key
        </label>
        <input
          id={`apikey-${provider}`}
          type="password"
          placeholder={`${provider} API key`}
          value={inputValue}
          onInput={handleInput}
          onBlur={handleBlur}
          aria-label={`${provider} API key`}
        />
        {stored && (
          <span class="llm-apikey-indicator" aria-label="Key stored locally">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text)" stroke-width="1.5" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            </svg>
          </span>
        )}
        {stored && (
          <button class="llm-apikey-clear" onClick={handleClear} title="Clear stored key" aria-label={`Clear stored ${provider} API key`}>
            &#x2715;
          </button>
        )}
      </div>
    </>
  );
}
