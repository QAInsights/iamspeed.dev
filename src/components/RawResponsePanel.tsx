/** @jsxImportSource preact */

interface RawResponsePanelProps {
  data: object | null;
}

const style = `
  .llm-raw details {
    margin-top: var(--rhythm);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.3s ease-in-out;
  }
  .llm-raw summary {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--text-muted);
    user-select: none;
    background: var(--surface);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: color 0.3s, background-color 0.3s;
  }
  .llm-raw summary:hover {
    color: var(--text);
    background-color: var(--border-light);
  }
  .llm-raw pre {
    padding: 0.75rem;
    font-size: 0.75rem;
    line-height: 1.5;
    max-height: 450px;
    overflow: auto;
    background: var(--surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--border-light);
    transition: background-color 0.8s ease-in-out, border-color 0.3s ease-in-out;
  }
  .llm-raw .json-key { color: var(--json-key); }
  .llm-raw .json-string { color: var(--json-string); }
  .llm-raw .json-number { color: var(--json-number); }
  .llm-raw .json-bool { color: var(--json-bool); }
  .llm-raw .json-null { color: var(--json-null); }
`;

function highlightJson(json: string): string {
  return json.replace(
    /("(?:[^"\\]|\\.)*")\s*:/g,
    '<span class="json-key">$1</span>:'
  ).replace(
    /:\s*("(?:[^"\\]|\\.)*")/g,
    ': <span class="json-string">$1</span>'
  ).replace(
    /:\s*(\d+\.?\d*)/g,
    ': <span class="json-number">$1</span>'
  ).replace(
    /:\s*(true|false)/g,
    ': <span class="json-bool">$1</span>'
  ).replace(
    /:\s*(null)/g,
    ': <span class="json-null">$1</span>'
  );
}

export function RawResponsePanel({ data }: RawResponsePanelProps) {
  if (!data) return null;

  const formatted = JSON.stringify(data, null, 2);
  const highlighted = highlightJson(formatted);

  return (
    <>
      <style>{style}</style>
      <div class="llm-raw">
        <details>
          <summary>Raw API Response</summary>
          <pre dangerouslySetInnerHTML={{ __html: highlighted }} />
        </details>
      </div>
    </>
  );
}
