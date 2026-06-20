/** @jsxImportSource preact */

import { Tooltip } from "./Tooltip";

interface HeroResultProps {
  heroText: string;
  isActive: boolean;
  ttft: number | null;
}

export function HeroResult({ heroText, isActive, ttft }: HeroResultProps) {
  const numberClass = `llm-hero-number${isActive ? " active" : ""}`;
  return (
    <>
      <span class="llm-hero-label" id="hero-label">Your LLM speed is</span>
      <div class="llm-hero-result" aria-live="polite" aria-atomic="true" aria-describedby="hero-label">
        <span class={numberClass}>{heroText}</span>
        <span class="llm-hero-unit">tokens / sec</span>
      </div>

      {ttft !== null && (
        <div class="llm-ttft">
          <div class="llm-ttft-value">{Math.round(ttft)}ms</div>
          <Tooltip label="How long before the model starts responding.">
            <div class="llm-ttft-label">First Token</div>
          </Tooltip>
        </div>
      )}
    </>
  );
}
