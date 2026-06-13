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
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .llm-apikey-indicator svg {
    width: 14px;
    height: 14px;
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
    setLoaded(false);
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
        <input
          type="password"
          placeholder={`${provider} API key`}
          value={inputValue}
          onInput={handleInput}
          onBlur={handleBlur}
          aria-label="API key"
        />
        <span class="llm-apikey-indicator">
          {stored ? (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="7" width="10" height="7" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            </svg>
          ) : null}
        </span>
        {stored && (
          <button class="llm-apikey-clear" onClick={handleClear} title="Clear stored key">
            &#x2715;
          </button>
        )}
      </div>
    </>
  );
}
