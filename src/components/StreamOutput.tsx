/** @jsxImportSource preact */
import { useEffect, useRef } from "preact/hooks";

interface StreamOutputProps {
  text: string;
  streaming: boolean;
}

// Strip common markdown formatting for cleaner display
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // **bold**
    .replace(/\*([^*]+)\*/g, "$1")       // *italic*
    .replace(/__([^_]+)__/g, "$1")       // __bold__
    .replace(/_([^_]+)_/g, "$1")         // _italic_
    .replace(/`([^`]+)`/g, "$1")         // `code`
    .replace(/^#+\s+/gm, "")             // # headers
    .replace(/^[-*+]\s+/gm, "")          // - list items
    .replace(/^\d+\.\s+/gm, "");         // 1. numbered lists
}

const style = `
  .llm-stream {
    max-height: 280px;
    overflow-y: auto;
    font-family: var(--mono);
    font-size: 0.8125rem;
    line-height: 1.7;
    padding: 1rem 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border-light);
    white-space: pre-wrap;
    word-break: break-word;
    margin-top: 0;
    border-radius: 0;
  }
  .llm-stream-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: var(--accent);
    vertical-align: text-bottom;
    margin-left: 1px;
    animation: llm-blink 1s step-end infinite;
  }
  @keyframes llm-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

export function StreamOutput({ text, streaming }: StreamOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  if (!text && !streaming) return null;

  const cleanText = stripMarkdown(text);

  return (
    <>
      <style>{style}</style>
      <div class="llm-stream" ref={containerRef}>
        {cleanText}
        {streaming && <span class="llm-stream-cursor" />}
      </div>
    </>
  );
}
