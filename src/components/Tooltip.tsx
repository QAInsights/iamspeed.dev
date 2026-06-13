/** @jsxImportSource preact */
import { useState, useRef, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";

interface TooltipProps {
  label: string;
  children: any;
}

const style = `
.llm-tip {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
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
  width: max-content;
  max-width: 248px;
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

let styleInjected = false;
function injectStyle() {
  if (styleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = style;
  document.head.appendChild(el);
  styleInjected = true;
}

export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => { injectStyle(); }, []);

  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.bottom });
    }
    setVisible(true);
  };

  const left = `max(8px, min(calc(100vw - 256px), ${pos.x - 124}px))`;

  const bubble = visible
    ? createPortal(
        <div
          class="llm-tip-bubble"
          style={{ left, top: `${pos.y + 8}px` }}
        >
          {label}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        class="llm-tip"
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </span>
      {bubble}
    </>
  );
}
