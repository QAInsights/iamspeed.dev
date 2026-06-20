/** @jsxImportSource preact */
import { useState } from "preact/hooks";

interface DataPoint {
  value: number;
  label: string;
}

interface SparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  showDots?: boolean;
}

const style = `
  .llm-sparkline-wrap {
    position: relative;
  }
  .llm-sparkline {
    display: block;
    overflow: visible;
  }
  .llm-sparkline-path {
    fill: none;
    stroke: var(--accent);
    stroke-width: var(--sp-stroke, 2);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .llm-sparkline-dot {
    fill: var(--accent);
    stroke: var(--surface);
    stroke-width: 2;
    cursor: pointer;
    transition: r 0.15s ease;
  }
  .llm-sparkline-dot:hover {
    r: 5;
  }
  .llm-sparkline-tooltip {
    position: absolute;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    color: var(--text);
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    z-index: 9999;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transform: translate(-50%, calc(-100% - 8px));
  }
  .llm-sparkline-tooltip-model {
    font-weight: 600;
    font-size: 0.6875rem;
  }
  .llm-sparkline-tooltip-value {
    color: var(--text-muted);
    font-size: 0.625rem;
    margin-top: 1px;
  }
`;

export function Sparkline({
  data,
  width = 300,
  height = 60,
  strokeWidth = 2,
  showDots = true,
}: SparklineProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint } | null>(null);

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((point, i) => {
    const x = padding + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth);
    const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
    return { x, y, point };
  });

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const handleDotEnter = (point: DataPoint, x: number, y: number) => {
    setTooltip({ x, y, point });
  };

  const handleDotLeave = () => {
    setTooltip(null);
  };

  return (
    <>
      <style>{style}</style>
      <div class="llm-sparkline-wrap" style={`--sp-stroke: ${strokeWidth}`}>
        <svg
          class="llm-sparkline"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Sparkline chart showing ${data.length} benchmark runs`}
        >
          <title>Benchmark performance sparkline</title>
          <path d={pathData} class="llm-sparkline-path" />
          {showDots &&
            points.map((p, i) => (
              <circle
                key={i}
                class="llm-sparkline-dot"
                cx={p.x}
                cy={p.y}
                r={3}
                tabIndex={0}
                role="button"
                aria-label={`${p.point.label}: ${p.point.value.toFixed(1)} tok/s`}
                onMouseEnter={() => handleDotEnter(p.point, p.x, p.y)}
                onMouseLeave={handleDotLeave}
                onFocus={() => handleDotEnter(p.point, p.x, p.y)}
                onBlur={handleDotLeave}
              />
            ))}
        </svg>
        {tooltip && (
          <div
            class="llm-sparkline-tooltip"
            role="tooltip"
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
          >
            <div class="llm-sparkline-tooltip-model">{tooltip.point.label}</div>
            <div class="llm-sparkline-tooltip-value">{tooltip.point.value.toFixed(1)} tok/s</div>
          </div>
        )}
      </div>
    </>
  );
}
