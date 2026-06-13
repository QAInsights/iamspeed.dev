/** @jsxImportSource preact */
import { useState, useRef } from "preact/hooks";

interface TooltipProps {
  label: string;
  children: any;
}

const style = `
.llm-tip {
  display: inline-flex;
  align-items: center;
  cursor: help;
}
.llm-tip-bubble {
  position: fixed;
  background: var(--tip-bg, #0f172a);
  color: var(--tip-fg, #f8fafc);
  font-family: var(--body);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.45;
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  white-space: normal;
  max-width: 220px;
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1);
  animation: tip-in 0.15s ease-out;
}
[data-theme="dark"] .llm-tip-bubble {
  --tip-bg: #e2e8f0;
  --tip-fg: #0f172a;
  box-shadow: 0 4px 16px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3);
}
@keyframes tip-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.bottom });
    }
    setVisible(true);
  };

  return (
    <>
      <style>{style}</style>
      <span
        class="llm-tip"
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </span>
      {visible && (
        <div
          class="llm-tip-bubble"
          style={{
            left: `${pos.x}px`,
            top: `${pos.y + 8}px`,
            transform: "translateX(-50%)",
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}
