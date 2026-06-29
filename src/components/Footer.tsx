/** @jsxImportSource preact */

/**
 * Reusable Footer component sharing developer branding, GitHub repository link,
 * and trademark disclaimers across all pages (Home, Leaderboard).
 */
import { Tooltip } from "./Tooltip";

export function Footer({ mode }: { mode?: string } = {}) {
  return (
    <>
      {mode === "race" && (
        <div class="race-footer" style="padding: 1.5rem 0 0.5rem; margin-top: -2rem;">
          Doc Hudson says: it's not about speed, it's about consistency.
        </div>
      )}
      <footer class="llm-footer" role="contentinfo">
        <a href="https://qainsights.com" target="_blank" rel="noopener noreferrer" aria-label="QAInsights (opens in new tab)">QAInsights</a>
        <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
        <a href="https://dosa.dev" target="_blank" rel="noopener noreferrer" aria-label="Dosa (opens in new tab)">Dosa</a>
        <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
        <a href="https://jmeter.ai" target="_blank" rel="noopener noreferrer" aria-label="JMeter.ai (opens in new tab)">JMeter.ai</a>
        <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
        <a href="https://achu.app" target="_blank" rel="noopener noreferrer" aria-label="Achu (opens in new tab)">Achu</a>
        <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
        <a href="https://github.com/qainsights/iamspeed.dev" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository (opens in new tab)">GitHub</a>
        <span class="llm-footer-dot" aria-hidden="true">&middot;</span>
        <span class="llm-footer-tooltip" title="&quot;Cars&quot;, &quot;Piston Cup&quot;, McQueen, Sally, Chick Hicks, and related character names are trademarks of Disney/Pixar. This is an unofficial fan project and is not affiliated with or endorsed by Disney.">
          Trademark
        </span>
      </footer>
    </>
  );
}
