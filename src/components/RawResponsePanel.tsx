/** @jsxImportSource preact */

interface RawResponsePanelProps {
  data: object | null;
}

const style = `
  .llm-raw details {
    margin-top: var(--rhythm);
    border: 1px solid var(--border-light);
  }
  .llm-raw summary {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--text-muted);
    user-select: none;
  }
  .llm-raw summary:hover {
    color: var(--text);
  }
  .llm-raw pre {
    padding: 0.75rem;
    font-size: 0.75rem;
    line-height: 1.5;
    max-height: 400px;
    overflow: auto;
    background: var(--surface);
    border-top: 1px solid var(--border-light);
  }
  .llm-raw .json-key { color: #881391; }
  .llm-raw .json-string { color: #1a7f37; }
  .llm-raw .json-number { color: #0550ae; }
  .llm-raw .json-bool { color: #cf222e; }
  .llm-raw .json-null { color: #6e7781; }
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
