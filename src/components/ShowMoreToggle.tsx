/** @jsxImportSource preact */

interface ShowMoreToggleProps {
  showMore: boolean;
  onToggle: () => void;
}

const style = `
  .llm-show-more {
    margin-top: 2rem;
    font-size: 0.75rem;
    color: var(--accent);
    cursor: pointer;
    background: none;
    border: none;
    letter-spacing: 0.02em;
    font-family: var(--body);
    transition: color 0.2s ease-in-out;
  }
  .llm-show-more:hover { text-decoration: underline; }
`;

export function ShowMoreToggle({ showMore, onToggle }: ShowMoreToggleProps) {
  return (
    <>
      <style>{style}</style>
      <button
        class="llm-show-more"
        onClick={onToggle}
        aria-expanded={showMore}
      >
        {showMore ? "Less metrics" : "More metrics"}
      </button>
    </>
  );
}
