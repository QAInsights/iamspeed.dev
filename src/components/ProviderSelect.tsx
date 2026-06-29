/** @jsxImportSource preact */

import { PROVIDERS } from "../lib/config";

interface ProviderSelectProps {
  value: string;
  onChange: (providerId: string) => void;
  disabled?: boolean;
}

const style = `
  .llm-provider-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    box-sizing: border-box;
  }
  .llm-provider-select:focus {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }
  .llm-provider-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export function ProviderSelect({ value, onChange, disabled = false }: ProviderSelectProps) {
  return (
    <>
      <style>{style}</style>
      <select
        class="llm-provider-select"
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        disabled={disabled}
        aria-label="Select provider"
      >
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <option key={id} value={id}>
            {p.displayName}
          </option>
        ))}
      </select>
    </>
  );
}
