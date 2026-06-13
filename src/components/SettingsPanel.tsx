/** @jsxImportSource preact */
import { useState, useEffect } from "preact/hooks";
import { saveKey, loadKey, clearKey, hasStoredKey } from "../lib/crypto";
import { PROVIDERS } from "../lib/config";
import { loadModels, type ModelEntry } from "../lib/modelRegistry";

export interface SettingsState {
  providerId: string;
  modelId: string;
  prompt: string;
  apiKey: string | null;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: SettingsState;
  onSettingsChange: (s: SettingsState) => void;
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
  .llm-settings {
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
  .llm-settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .llm-settings-title {
    font-family: var(--mono);
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .llm-settings-close {
    font-size: 1.25rem;
    color: var(--text-muted);
    padding: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    line-height: 1;
  }
  .llm-settings-close:hover {
    color: var(--text);
  }
  .llm-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .llm-field-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
  .llm-provider-tabs {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .llm-provider-tab {
    flex: 1;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.8125rem;
    font-weight: 500;
    background: var(--surface);
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    border-right: 1px solid var(--border);
  }
  .llm-provider-tab:last-child {
    border-right: none;
  }
  .llm-provider-tab.active {
    color: var(--text);
    background: var(--bg);
  }
  .llm-provider-tab:hover:not(.active) {
    color: var(--text);
  }
  .llm-select {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
  }
  .llm-textarea {
    width: 100%;
    min-height: 80px;
    padding: 0.75rem;
    font-size: 0.8125rem;
    font-family: var(--body);
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: 0;
  }
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
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .llm-key-indicator svg {
    width: 14px;
    height: 14px;
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
  .llm-models-loading {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }
  .llm-settings-done {
    margin-top: auto;
    padding: 0.75rem;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    font-size: 0.8125rem;
    border: none;
    cursor: pointer;
    text-align: center;
    letter-spacing: 0.02em;
  }
  .llm-settings-done:hover {
    background: var(--accent-hover);
  }
  .llm-disclaimer {
    font-size: 0.6875rem;
    color: var(--text-muted);
    line-height: 1.5;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-light);
  }
`;

export function SettingsPanel({ open, onClose, settings, onSettingsChange }: SettingsPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [stored, setStored] = useState(false);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStored(hasStoredKey(settings.providerId));
    setInputValue("");

    loadKey(settings.providerId).then((key) => {
      if (key) {
        setInputValue(key);
        onSettingsChange({ ...settings, apiKey: key });
      }
    });

    // Load models for the current provider
    setModelsLoading(true);
    loadModels(settings.providerId).then((loadedModels) => {
      setModels(loadedModels);
      setModelsLoading(false);

      // If current model is not in the list, select the first one
      if (loadedModels.length > 0 && !loadedModels.some((m) => m.id === settings.modelId)) {
        onSettingsChange({ ...settings, modelId: loadedModels[0].id });
      }
    });
  }, [open, settings.providerId]);

  if (!open) return null;

  const handleProviderChange = async (id: string) => {
    setModelsLoading(true);
    const loadedModels = await loadModels(id);
    setModels(loadedModels);
    setModelsLoading(false);

    onSettingsChange({
      ...settings,
      providerId: id,
      modelId: loadedModels[0]?.id || "",
    });
  };

  const handleKeyInput = (e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    setInputValue(val);
    onSettingsChange({ ...settings, apiKey: val.trim() || null });
  };

  const handleKeyBlur = async () => {
    if (inputValue.trim()) {
      await saveKey(settings.providerId, inputValue.trim());
      setStored(true);
      onSettingsChange({ ...settings, apiKey: inputValue.trim() });
    }
  };

  const handleClearKey = () => {
    clearKey(settings.providerId);
    setStored(false);
    setInputValue("");
    onSettingsChange({ ...settings, apiKey: null });
  };

  return (
    <>
      <style>{style}</style>
      <div class="llm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div class="llm-settings">
          <div class="llm-settings-header">
            <span class="llm-settings-title">Settings</span>
            <button class="llm-settings-close" onClick={onClose}>&#x2715;</button>
          </div>

          <div class="llm-field">
            <label class="llm-field-label">Provider</label>
            <div class="llm-provider-tabs">
              {Object.entries(PROVIDERS).map(([id, p]) => (
                <button
                  key={id}
                  class={`llm-provider-tab${id === settings.providerId ? " active" : ""}`}
                  onClick={() => handleProviderChange(id)}
                >
                  {p.displayName}
                </button>
              ))}
            </div>
          </div>

          <div class="llm-field">
            <label class="llm-field-label">API Key</label>
            <div class="llm-key-row">
              <input
                type="password"
                placeholder={`${settings.providerId} API key`}
                value={inputValue}
                onInput={handleKeyInput}
                onBlur={handleKeyBlur}
                aria-label="API key"
              />
              {stored && (
                <>
                  <span class="llm-key-indicator">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="7" width="10" height="7" />
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                    </svg>
                  </span>
                  <button class="llm-key-clear" onClick={handleClearKey}>&#x2715;</button>
                </>
              )}
            </div>
          </div>

          <div class="llm-field">
            <label class="llm-field-label">Model</label>
            {modelsLoading ? (
              <span class="llm-models-loading">Loading models...</span>
            ) : (
              <select
                class="llm-select"
                value={settings.modelId}
                onInput={(e) => onSettingsChange({ ...settings, modelId: (e.target as HTMLSelectElement).value })}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.contextWindow > 0 ? `${(m.contextWindow / 1000).toFixed(0)}k ctx` : "ctx unknown"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div class="llm-field">
            <label class="llm-field-label">Prompt</label>
            <textarea
              class="llm-textarea"
              value={settings.prompt}
              onInput={(e) => onSettingsChange({ ...settings, prompt: (e.target as HTMLTextAreaElement).value })}
            />
          </div>

          <p class="llm-disclaimer">
            I am speed. sends requests directly from your browser to the provider API using your API key.
            You will be charged based on the model's published pricing. Keys are encrypted locally
            and never leave your device.
          </p>

          <button class="llm-settings-done" onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
}
