/** @jsxImportSource preact */
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { Tooltip } from "./Tooltip";
import { getSpeedGrade } from "../lib/grade";
import { PROVIDERS } from "../lib/config";

/**
 * Leaderboard table — Simple mode.
 *
 * Fetches entries from `/api/leaderboard` on mount. Styling mirrors the
 * RecentRuns table (monospace, tabular-nums, uppercase tiny headers, accent
 * TPS) so it feels native to the existing design system.
 */

export interface LeaderboardEntry {
  id: string;
  rank: number;
  handle: string;
  region: string;
  provider: string;
  model: string;
  tps: number;
  ttft: number;
  ttlt: number;
  createdAt: string; // ISO
}

const style = `
  .llm-lb {
    width: 100%;
    max-width: var(--max-w);
    padding: 1.5rem 0 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .llm-lb-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .llm-lb-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .llm-lb-title {
    font-family: var(--mono);
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text);
  }
  .llm-lb-subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  .llm-lb-filters-row {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }
  .llm-lb-filter-btn {
    padding: 0.25rem 0.625rem;
    font-family: var(--mono);
    font-size: 0.625rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: var(--text-muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }
  .llm-lb-filter-btn:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }
  .llm-lb-filter-btn.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--border-light);
    font-weight: 600;
  }
  .llm-lb-sort-toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--surface);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .llm-lb-sort-btn {
    padding: 0.375rem 0.875rem;
    font-family: var(--mono);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: var(--text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.2s, background-color 0.2s;
    text-transform: uppercase;
  }
  .llm-lb-sort-btn:hover {
    color: var(--text);
  }
  .llm-lb-sort-btn.llm-lb-sort-active {
    color: var(--accent);
    background: var(--border-light);
    font-weight: 600;
  }
  .llm-lb-sort-divider {
    width: 1px;
    background: var(--border);
  }
  .llm-lb-table-wrap {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    overflow: hidden;
  }
  .llm-lb-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--mono);
    font-size: 0.75rem;
    table-layout: fixed;
  }
  .llm-lb-table thead th {
    font-size: 0.625rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.625rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .llm-lb-table thead th.llm-lb-num {
    text-align: right;
  }
  .llm-lb-table thead th.llm-lb-rank {
    width: 42px;
    text-align: center;
  }
  .llm-lb-table thead th.llm-lb-handle {
    width: 20%;
  }
  .llm-lb-table thead th.llm-lb-prov {
    width: 12%;
  }
  .llm-lb-table thead th.llm-lb-model {
    width: 18%;
  }
  .llm-lb-table thead th.llm-lb-tps {
    width: 96px;
    text-align: right;
  }
  .llm-lb-table thead th.llm-lb-ttft {
    width: 80px;
    text-align: right;
  }
  .llm-lb-table thead th.llm-lb-region {
    width: 104px;
  }
  .llm-lb-table tbody td {
    padding: 0.625rem 0.75rem;
    color: var(--text);
    border-bottom: 1px solid var(--border-light);
    transition: background 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .llm-lb-table tbody tr:last-child td {
    border-bottom: none;
  }
  .llm-lb-table tbody tr:hover td {
    background: var(--border-light);
  }
  .llm-lb-table tbody td.llm-lb-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .llm-lb-table tbody td.llm-lb-rank-cell {
    text-align: center;
    font-weight: 600;
    color: var(--text-muted);
  }
  .llm-lb-rank-1 { color: #e0a800; }
  .llm-lb-rank-2 { color: #a0a0a0; }
  .llm-lb-rank-3 { color: #cd7f32; }
  [data-theme="dark"] .llm-lb-rank-1 { color: #fbbf24; }
  [data-theme="dark"] .llm-lb-rank-2 { color: #d1d5db; }
  [data-theme="dark"] .llm-lb-rank-3 { color: #d97706; }

  /* Animated gradient border around top-3 rows on sort toggle.
     Uses inset box-shadow to draw colored edges — no layout shift. */
  @keyframes llm-lb-podium-glow {
    0%   { box-shadow: inset 0 2px 0 0 #6366f1, inset 0 -2px 0 0 #6366f1; }
    25%  { box-shadow: inset 0 2px 0 0 #a855f7, inset 0 -2px 0 0 #a855f7; }
    50%  { box-shadow: inset 0 2px 0 0 #00e676, inset 0 -2px 0 0 #00e676; }
    75%  { box-shadow: inset 0 2px 0 0 #ffd600, inset 0 -2px 0 0 #ffd600; }
    100% { box-shadow: inset 0 2px 0 0 transparent, inset 0 -2px 0 0 transparent; }
  }
  @keyframes llm-lb-podium-glow-first {
    0%   { box-shadow: inset 2px 0 0 0 #6366f1, inset 0 2px 0 0 #6366f1, inset 0 -2px 0 0 #6366f1; }
    25%  { box-shadow: inset 2px 0 0 0 #a855f7, inset 0 2px 0 0 #a855f7, inset 0 -2px 0 0 #a855f7; }
    50%  { box-shadow: inset 2px 0 0 0 #00e676, inset 0 2px 0 0 #00e676, inset 0 -2px 0 0 #00e676; }
    75%  { box-shadow: inset 2px 0 0 0 #ffd600, inset 0 2px 0 0 #ffd600, inset 0 -2px 0 0 #ffd600; }
    100% { box-shadow: inset 2px 0 0 0 transparent, inset 0 2px 0 0 transparent, inset 0 -2px 0 0 transparent; }
  }
  @keyframes llm-lb-podium-glow-last {
    0%   { box-shadow: inset -2px 0 0 0 #6366f1, inset 0 2px 0 0 #6366f1, inset 0 -2px 0 0 #6366f1; }
    25%  { box-shadow: inset -2px 0 0 0 #a855f7, inset 0 2px 0 0 #a855f7, inset 0 -2px 0 0 #a855f7; }
    50%  { box-shadow: inset -2px 0 0 0 #00e676, inset 0 2px 0 0 #00e676, inset 0 -2px 0 0 #00e676; }
    75%  { box-shadow: inset -2px 0 0 0 #ffd600, inset 0 2px 0 0 #ffd600, inset 0 -2px 0 0 #ffd600; }
    100% { box-shadow: inset -2px 0 0 0 transparent, inset 0 2px 0 0 transparent, inset 0 -2px 0 0 transparent; }
  }
  .llm-lb-podium-flash td {
    animation: llm-lb-podium-glow 1.5s ease-out forwards;
  }
  .llm-lb-podium-flash td:first-child {
    animation: llm-lb-podium-glow-first 1.5s ease-out forwards;
  }
  .llm-lb-podium-flash td:last-child {
    animation: llm-lb-podium-glow-last 1.5s ease-out forwards;
  }
  .llm-lb-podium-flash-1 td { animation-delay: 0s; }
  .llm-lb-podium-flash-2 td { animation-delay: 0.08s; }
  .llm-lb-podium-flash-3 td { animation-delay: 0.16s; }
  .llm-lb-handle-cell {
    font-weight: 500;
    color: var(--text);
  }
  .llm-lb-tps-cell {
    font-weight: 600;
    color: var(--accent);
  }
  .llm-lb-ttft-cell {
    font-weight: 600;
    color: var(--accent);
  }
  .llm-lb-sort-col {
    color: var(--accent) !important;
  }
  .llm-lb-model-cell {
    color: var(--text-muted);
    font-size: 0.6875rem;
  }
  .llm-lb-region-cell {
    color: var(--text-muted);
    font-size: 0.6875rem;
    overflow: visible;
    text-overflow: clip;
  }
  .llm-lb-empty {
    padding: 3rem 1rem;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }
  .llm-lb-skeleton {
    padding: 0.625rem 0.625rem;
    border-bottom: 1px solid var(--border-light);
  }
  .llm-lb-skeleton-bar {
    height: 0.75rem;
    border-radius: 4px;
    background: var(--border-light);
    animation: llm-lb-pulse 1.4s ease-in-out infinite;
  }
  @keyframes llm-lb-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  .llm-lb-row-tip {
    position: fixed;
    background: var(--tip-bg, #0f172a);
    color: var(--tip-fg, #f8fafc);
    font-family: var(--body);
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.5;
    padding: 0.625rem 0.875rem;
    border-radius: 8px;
    width: max-content;
    max-width: 320px;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1);
    animation: tip-in 0.15s ease-out;
  }
  [data-theme="dark"] .llm-lb-row-tip {
    --tip-bg: #e2e8f0;
    --tip-fg: #0f172a;
    box-shadow: 0 4px 16px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3);
  }
  .llm-lb-row-tip-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.75rem;
    font-family: var(--mono);
    font-size: 0.6875rem;
  }
  .llm-lb-row-tip-label {
    color: var(--tip-fg-muted, rgba(248,250,252,0.6));
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.625rem;
    align-self: center;
  }
  [data-theme="dark"] .llm-lb-row-tip-label {
    --tip-fg-muted: rgba(15,23,42,0.55);
  }
  .llm-lb-row-tip-value {
    color: var(--tip-fg, #f8fafc);
    font-weight: 400;
    text-align: right;
  }
  .llm-lb-row-tip-title {
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid var(--tip-fg-muted, rgba(248,250,252,0.15));
    color: var(--tip-fg, #f8fafc);
  }
  [data-theme="dark"] .llm-lb-row-tip-title {
    border-bottom-color: rgba(15,23,42,0.15);
  }
`;

function formatTps(tps: number): string {
  return tps >= 100 ? tps.toFixed(0) : tps.toFixed(1);
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function formatModel(model: string): string {
  return model.includes("/") ? model.split("/").slice(1).join("/") : model;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rankClass(rank: number): string {
  if (rank === 1) return "llm-lb-rank-1";
  if (rank === 2) return "llm-lb-rank-2";
  if (rank === 3) return "llm-lb-rank-3";
  return "";
}

export function LeaderboardTable() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<{ entry: LeaderboardEntry; x: number; y: number } | null>(null);
  const [sortBy, setSortBy] = useState<"tps" | "ttft">("tps");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const prevSort = useRef(sortBy);

  // Trigger the podium flash animation whenever the sort metric changes
  useEffect(() => {
    if (prevSort.current !== sortBy) {
      setFlashKey((k) => k + 1);
      prevSort.current = sortBy;
    }
  }, [sortBy]);

  const handleSortChange = useCallback((next: "tps" | "ttft") => {
    setSortBy(next);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = providerFilter 
        ? `/api/leaderboard?limit=15&provider=${encodeURIComponent(providerFilter)}`
        : "/api/leaderboard?limit=15";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data);
    } catch {
      setError("Couldn't load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [providerFilter]);

  // Load on mount and filter changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      // Refresh without full loading state to avoid visual flickering
      fetch("/api/leaderboard?limit=15" + (providerFilter ? `&provider=${encodeURIComponent(providerFilter)}` : ""))
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((data) => {
          if (data) setEntries(data);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [providerFilter]);

  // Re-sort and re-rank entries client-side based on the selected metric
  const rankedEntries: LeaderboardEntry[] = entries
    .map((e) => ({ ...e }))
    .sort((a, b) => sortBy === "tps" ? b.tps - a.tps : a.ttft - b.ttft)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const handleRowEnter = useCallback((e: Event, entry: LeaderboardEntry) => {
    const tr = e.currentTarget as HTMLTableRowElement;
    const r = tr.getBoundingClientRect();
    setHoveredRow({ entry, x: r.left + r.width / 2, y: r.bottom });
  }, []);

  const tipLeft = hoveredRow
    ? `max(8px, min(calc(100vw - 328px), ${hoveredRow.x - 160}px))`
    : "0px";

  const rowTip = hoveredRow
    ? createPortal(
        <div
          class="llm-lb-row-tip"
          role="tooltip"
          style={{ left: tipLeft, top: `${hoveredRow.y + 8}px` }}
        >
          <div class="llm-lb-row-tip-title">
            #{hoveredRow.entry.rank} - {hoveredRow.entry.handle}
          </div>
          <div class="llm-lb-row-tip-grid">
            <span class="llm-lb-row-tip-label">Provider</span>
            <span class="llm-lb-row-tip-value">{hoveredRow.entry.provider}</span>
            <span class="llm-lb-row-tip-label">Model</span>
            <span class="llm-lb-row-tip-value">{hoveredRow.entry.model}</span>
            <span class="llm-lb-row-tip-label">TPS</span>
            <span class="llm-lb-row-tip-value">{formatTps(hoveredRow.entry.tps)} tok/s</span>
            <span class="llm-lb-row-tip-label">TTFT</span>
            <span class="llm-lb-row-tip-value">{formatMs(hoveredRow.entry.ttft)}</span>
            <span class="llm-lb-row-tip-label">Total time</span>
            <span class="llm-lb-row-tip-value">{formatMs(hoveredRow.entry.ttlt)}</span>
            <span class="llm-lb-row-tip-label">Region</span>
            <span class="llm-lb-row-tip-value">{hoveredRow.entry.region}</span>
            <span class="llm-lb-row-tip-label">Submitted</span>
            <span class="llm-lb-row-tip-value">{formatFullDate(hoveredRow.entry.createdAt)}</span>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <style>{style}</style>
      <div class="llm-lb">
        <div class="llm-lb-header">
          <div class="llm-lb-title-row">
            <div>
              <h2 class="llm-lb-title">Leaderboard</h2>
              <p class="llm-lb-subtitle">
                {sortBy === "tps"
                  ? "Top speeds - ranked by tokens per second."
                  : "Fastest starts - ranked by time to first token."}
              </p>
            </div>
            <div class="llm-lb-sort-toggle" role="group" aria-label="Sort leaderboard by">
              <button
                class={`llm-lb-sort-btn ${sortBy === "tps" ? "llm-lb-sort-active" : ""}`}
                onClick={() => handleSortChange("tps")}
                aria-pressed={sortBy === "tps"}
              >
                TPS
              </button>
              <span class="llm-lb-sort-divider" aria-hidden="true" />
              <button
                class={`llm-lb-sort-btn ${sortBy === "ttft" ? "llm-lb-sort-active" : ""}`}
                onClick={() => handleSortChange("ttft")}
                aria-pressed={sortBy === "ttft"}
              >
                TTFT
              </button>
            </div>
          </div>
          <div class="llm-lb-filters-row">
            {[
              { id: null, label: "All" },
              { id: "openai", label: "OpenAI" },
              { id: "anthropic", label: "Anthropic" },
              { id: "groq", label: "Groq" },
              { id: "cerebras", label: "Cerebras" },
              { id: "fireworks", label: "Fireworks" },
              { id: "google", label: "Google" },
              { id: "mistral", label: "Mistral" },
              { id: "openrouter", label: "OpenRouter" },
              { id: "xai", label: "x.ai" },
              { id: "local", label: "Local" }
            ].map((p) => (
              <button
                key={p.label}
                class={`llm-lb-filter-btn ${providerFilter === p.id ? "active" : ""}`}
                onClick={() => setProviderFilter(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div class="llm-lb-table-wrap">
          {loading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} class="llm-lb-skeleton">
                  <div class="llm-lb-skeleton-bar" style={`width: ${60 + (i * 7) % 30}%`} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div class="llm-lb-empty" role="alert">
              {error} <button onClick={fetchLeaderboard} style="color: var(--accent); text-decoration: underline; background: none; border: none; cursor: pointer; font-size: inherit;">Retry</button>
            </div>
          ) : entries.length === 0 ? (
            <div class="llm-lb-empty" role="status">
              No submissions yet. Be the first!
            </div>
          ) : (
            <table class="llm-lb-table">
              <thead>
                <tr>
                  <th scope="col" class="llm-lb-rank">#</th>
                  <th scope="col" class="llm-lb-handle">Handle</th>
                  <th scope="col" class="llm-lb-prov">Provider</th>
                  <th scope="col" class="llm-lb-model">Model</th>
                  <th scope="col" class={`llm-lb-tps llm-lb-num ${sortBy === "tps" ? "llm-lb-sort-col" : ""}`}>
                    <Tooltip label="Output generation speed.">
                      <span>TPS</span>
                    </Tooltip>
                  </th>
                  <th scope="col" class={`llm-lb-ttft llm-lb-num ${sortBy === "ttft" ? "llm-lb-sort-col" : ""}`}>
                    <Tooltip label="Time to first token.">
                      <span>TTFT</span>
                    </Tooltip>
                  </th>
                  <th scope="col" class="llm-lb-region">Region</th>
                </tr>
              </thead>
              <tbody>
                {rankedEntries.map((entry) => {
                  const isPodium = entry.rank <= 3;
                  const flashClass = isPodium && flashKey > 0
                    ? `llm-lb-podium-flash llm-lb-podium-flash-${entry.rank}`
                    : "";
                  // Include flashKey in the key to force remount → retrigger CSS animation
                  const rowKey = flashKey > 0 ? `${entry.id}-${flashKey}` : entry.id;
                  return (
                    <tr
                      key={rowKey}
                      class={flashClass}
                      onMouseEnter={(e) => handleRowEnter(e, entry)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td class={`llm-lb-rank-cell ${rankClass(entry.rank)}`}>{entry.rank}</td>
                      <td class="llm-lb-handle-cell">{entry.handle}</td>
                      <td>{PROVIDERS[entry.provider]?.displayName || entry.provider}</td>
                      <td class="llm-lb-model-cell">{formatModel(entry.model)}</td>
                      <td class={`llm-lb-num llm-lb-tps-cell ${sortBy === "tps" ? "llm-lb-sort-col" : ""}`}>{getSpeedGrade(entry.tps).emoji} {formatTps(entry.tps)}</td>
                      <td class={`llm-lb-num ${sortBy === "ttft" ? "llm-lb-sort-col llm-lb-ttft-cell" : ""}`}>{formatMs(entry.ttft)}</td>
                      <td class="llm-lb-region-cell">{entry.region}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {rowTip}
    </>
  );
}
