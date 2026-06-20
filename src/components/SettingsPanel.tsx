/** @jsxImportSource preact */
import { useState, useEffect, useRef } from "preact/hooks";
import { saveKey, loadKey, clearKey, hasStoredKey } from "../lib/crypto";
import { loadModels, discoverLocalModels, type ModelEntry } from "../lib/modelRegistry";
import { LOCAL_PROVIDER_ID, DEFAULT_LOCAL_BASE_URL } from "../lib/config";
import { ProviderSelect } from "./ProviderSelect";
import { ApiKeyField } from "./ApiKeyField";

export interface SettingsState {
  providerId: string;
  modelId: string;
  prompt: string;
  apiKey: string | null;
  baseUrl?: string;
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
    width: 450px;
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
    border: none;
    padding: 0;
    margin: 0;
  }
  .llm-field legend {
    padding: 0;
  }
  .llm-field-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
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
    min-height: 90px;
    padding: 0.75rem;
    font-size: 0.8125rem;
    font-family: var(--body);
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: 0;
  }
  .llm-models-loading {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }
  .llm-models-empty {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 0.5rem 0;
    font-style: italic;
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
  const panelRef = useRef<HTMLDivElement>(null);

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

    const isLocal = settings.providerId === LOCAL_PROVIDER_ID;
    setModelsLoading(true);

    const loadForProvider = async () => {
      let loaded: ModelEntry[] = [];
      if (isLocal && settings.baseUrl) {
        loaded = await discoverLocalModels(settings.baseUrl);
      } else if (!isLocal) {
        loaded = await loadModels(settings.providerId);
      }
      setModels(loaded);
      setModelsLoading(false);

      if (loaded.length > 0 && !loaded.some((m) => m.id === settings.modelId)) {
        onSettingsChange({ ...settings, modelId: loaded[0].id });
      }
    };

    loadForProvider();
  }, [open, settings.providerId, settings.baseUrl]);

  // Focus trap and Escape key
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    // Focus the close button when panel opens
    const closeButton = panel.querySelector<HTMLButtonElement>(".llm-settings-close");
    closeButton?.focus();

    const getFocusable = () =>
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleProviderChange = async (id: string) => {
    setModelsLoading(true);
    const isLocal = id === LOCAL_PROVIDER_ID;
    let loadedModels: ModelEntry[] = [];

    let nextBase = settings.baseUrl;
    if (isLocal && !nextBase) {
      nextBase = DEFAULT_LOCAL_BASE_URL;
    }

    if (isLocal && nextBase) {
      loadedModels = await discoverLocalModels(nextBase);
    } else if (!isLocal) {
      loadedModels = await loadModels(id);
    }

    setModels(loadedModels);
    setModelsLoading(false);

    onSettingsChange({
      ...settings,
      providerId: id,
      modelId: loadedModels[0]?.id || "",
      baseUrl: isLocal ? nextBase : settings.baseUrl,
    });
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
        <div class="llm-settings" ref={panelRef} role="dialog" aria-modal="true" aria-label="Settings">
          <div class="llm-settings-header">
            <h2 class="llm-settings-title">Settings</h2>
            <button class="llm-settings-close" onClick={onClose} aria-label="Close settings">&#x2715;</button>
          </div>

          <fieldset class="llm-field">
            <legend class="llm-field-label">Provider</legend>
            <ProviderSelect
              value={settings.providerId}
              onChange={handleProviderChange}
            />
          </fieldset>

          {settings.providerId === LOCAL_PROVIDER_ID && (
            <div class="llm-field">
              <label class="llm-field-label" for="settings-baseurl">Base URL</label>
              <input
                id="settings-baseurl"
                type="text"
                class="llm-select"
                placeholder={DEFAULT_LOCAL_BASE_URL}
                value={settings.baseUrl || ""}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  onSettingsChange({ ...settings, baseUrl: val });
                }}
                onBlur={async () => {
                  // Attempt auto-discover on blur for convenience
                  if (settings.baseUrl) {
                    setModelsLoading(true);
                    const discovered = await discoverLocalModels(settings.baseUrl);
                    setModels(discovered);
                    setModelsLoading(false);
                    if (discovered.length > 0 && !discovered.some((m) => m.id === settings.modelId)) {
                      onSettingsChange({ ...settings, modelId: discovered[0].id });
                    }
                  }
                }}
              />
              <div class="llm-models-empty" style="margin-top: 0.25rem;">
                Default for Ollama. Change for LM Studio (1234), llama.cpp, etc.
              </div>
            </div>
          )}

          <div class="llm-field">
            <label class="llm-field-label" for="settings-apikey">
              {settings.providerId === LOCAL_PROVIDER_ID ? "API Key (optional)" : "API Key"}
            </label>
            <ApiKeyField
              providerId={settings.providerId}
              value={inputValue}
              stored={stored}
              onInput={(val) => {
                setInputValue(val);
                onSettingsChange({ ...settings, apiKey: val.trim() || null });
              }}
              onBlur={handleKeyBlur}
              onClear={handleClearKey}
            />
          </div>

          <div class="llm-field">
            <label class="llm-field-label" for="settings-model">Model</label>
            {settings.providerId === LOCAL_PROVIDER_ID ? (
              <>
                <input
                  id="settings-model"
                  type="text"
                  class="llm-select"
                  placeholder="e.g. llama3.2 or mistral"
                  value={settings.modelId}
                  onInput={(e) =>
                    onSettingsChange({ ...settings, modelId: (e.target as HTMLInputElement).value })
                  }
                />
                <button
                  type="button"
                  class="llm-key-clear"
                  style="margin-top: 0.5rem;"
                  onClick={async () => {
                    if (!settings.baseUrl) return;
                    setModelsLoading(true);
                    const discovered = await discoverLocalModels(settings.baseUrl);
                    setModels(discovered);
                    setModelsLoading(false);
                    if (discovered.length > 0) {
                      onSettingsChange({ ...settings, modelId: discovered[0].id });
                    }
                  }}
                >
                  Discover models from endpoint
                </button>
                {models.length > 0 && (
                  <div class="llm-models-empty" style="margin-top: 0.25rem;">
                    Discovered: {models.map((m) => m.id).join(", ")}
                  </div>
                )}
              </>
            ) : modelsLoading ? (
              <span class="llm-models-loading" role="status">Loading models...</span>
            ) : models.length === 0 ? (
              <span class="llm-models-empty" role="status">No models returned for this provider</span>
            ) : (
              <select
                id="settings-model"
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
            <label class="llm-field-label" for="settings-prompt">Prompt</label>
            <textarea
              id="settings-prompt"
              class="llm-textarea"
              value={settings.prompt}
              onInput={(e) => onSettingsChange({ ...settings, prompt: (e.target as HTMLTextAreaElement).value })}
            />
          </div>

          <p class="llm-disclaimer" id="settings-disclaimer">
            {settings.providerId === LOCAL_PROVIDER_ID ? (
              <>
                Requests go directly from your browser to your local server. Most local servers (Ollama, LM Studio)
                do not require an API key. Make sure the server allows browser connections (CORS). For Ollama run
                with OLLAMA_ORIGINS="*" or set the env var.
              </>
            ) : (
              <>
                I am speed. sends requests directly from your browser to the provider API using your API key.
                You will be charged based on the model's published pricing. Keys are encrypted locally
                and never leave your device.
              </>
            )}
          </p>

          <button class="llm-settings-done" onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
}
