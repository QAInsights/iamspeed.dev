/** @jsxImportSource preact */

const style = `
  .llm-disclaimer {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.5;
    padding: var(--rhythm) 0;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: var(--rhythm);
  }
`;

export function Disclaimer() {
  return (
    <>
      <style>{style}</style>
      <p class="llm-disclaimer">
        I am speed. sends requests directly from your browser to the provider API using your API key.
        You will be charged based on the model's published pricing. Keys are encrypted locally
        and never leave your device.
      </p>
    </>
  );
}
