/** @jsxImportSource preact */

interface BenchmarkHintProps {
  error: string | null;
}

const style = `
  .llm-error {
    color: #f59e0b; /* softer amber for model/provider notices */
    font-size: 0.75rem;
    margin-top: 0.75rem;
    text-align: center;
    max-width: var(--max-w);
    opacity: 0.9;
  }
`;

export function BenchmarkHint({ error }: BenchmarkHintProps) {
  return (
    <>
      <style>{style}</style>
      {error && <div class="llm-error" role="alert">{error}</div>}
    </>
  );
}
