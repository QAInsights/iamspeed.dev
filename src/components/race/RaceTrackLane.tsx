/** @jsxImportSource preact */
import type { LaneState } from "../../lib/race/types";
import { LANE_COLORS } from "../../lib/race/types";

interface RaceTrackLaneProps {
  lane: LaneState;
  /** 0-based lane index, maps to LANE_COLORS. */
  laneIndex: number;
  /** Highest tokenCount across all lanes — denominator for relative progress. */
  leaderTokens: number;
  providerDisplayName: string;
}

function formatTps(tps: number | null): string {
  if (tps === null) return "--";
  return String(tps);
}

function formatMs(ms: number | null): string {
  if (ms === null) return "--";
  return `${Math.round(ms)}ms`;
}

function finishMedal(rank: number | null): string | null {
  if (rank === null) return null;
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

/**
 * Compute a car's 0..1 progress along the track from live lane state.
 *
 * - Held at the start line until the first token arrives (visualizes TTFT).
 * - While running, capped at 0.92 so the leader never visually crosses the
 *   finish line until the stream actually completes.
 * - Done (with tokens) locks at 1 — the car crosses the line.
 * - Errored with zero tokens stays at 0.
 */
function computeProgress(lane: LaneState, leaderTokens: number): number {
  if (lane.status === "done" && lane.tokenCount > 0) return 1;
  if (lane.status === "error" && lane.tokenCount === 0) return 0;
  // Held at start until first token.
  if (lane.status === "running" && lane.ttft === null) return 0;
  const denom = Math.max(1, leaderTokens);
  const raw = lane.tokenCount / denom;
  return Math.min(0.92, Math.max(0, raw));
}

export function RaceTrackLane({
  lane,
  laneIndex,
  leaderTokens,
  providerDisplayName,
}: RaceTrackLaneProps) {
  const color = LANE_COLORS[laneIndex] ?? LANE_COLORS[0];
  const progress = computeProgress(lane, leaderTokens);
  const medal = finishMedal(lane.finishRank);
  const isRunning = lane.status === "running";
  const isError = lane.status === "error";
  const showText = lane.text.length > 0;
  // Position the car via percentage of the track width. The car element has
  // its own width, so 100% would push it off the right edge; we keep the
  // finish-line crossing handled by the done state (progress = 1) and rely on
  // the car's translateX(-100%) self-anchoring at the right edge.
  const carLeftPct = progress * 100;

  return (
    <div
      class={`race-track-lane race-track-lane--${lane.status}`}
      style={`--lane-color: ${color.hex};`}
      data-lane-id={lane.laneId}
    >
      <div class="race-track-lane-header">
        <span class="race-track-lane-name">{color.label}</span>
        <span class="race-track-lane-model">{providerDisplayName} · {lane.modelId}</span>
        {medal && (
          <span class="race-track-lane-medal" aria-label={`Finish rank ${lane.finishRank}`}>{medal}</span>
        )}
      </div>

      <div class="race-track-surface" role="img" aria-label={`${color.label} progress ${Math.round(progress * 100)}%`}>
        <div class="race-track-start-line" aria-hidden="true" />
        <div class="race-track-finish-line" aria-hidden="true" />
        <div
          class="race-track-car"
          style={`left: ${carLeftPct}%;`}
          aria-hidden="true"
        >
          <span class="race-track-car-number">{laneIndex + 1}</span>
        </div>
      </div>

      <div class="race-track-lane-progress" aria-hidden="true">
        <div class="race-track-lane-progress-fill" style={`width: ${progress * 100}%;`} />
      </div>

      <div class="race-track-lane-metrics">
        <div class="race-track-lane-tps">
          <span class="race-track-lane-tps-value">{formatTps(lane.tps)}</span>
          <span class="race-track-lane-tps-unit">tok/s</span>
        </div>
        <div class="race-track-lane-secondary">
          <span class="race-track-lane-tokens">
            {lane.tokenCount} <span class="race-track-lane-secondary-label">tok</span>
          </span>
          <span class="race-track-lane-ttft">
            {formatMs(lane.ttft)} <span class="race-track-lane-secondary-label">TTFT</span>
          </span>
          <span class="race-track-lane-ttlt">
            {formatMs(lane.ttlt)} <span class="race-track-lane-secondary-label">TTLT</span>
          </span>
        </div>
      </div>

      {isRunning && lane.providerQueued && lane.ttft === null && (
        <div class="race-track-lane-status" role="status">Queued at provider…</div>
      )}
      {isRunning && !lane.providerQueued && lane.ttft === null && (
        <div class="race-track-lane-status" role="status">Waiting for first token…</div>
      )}

      {showText && (
        <div class="race-track-lane-text" aria-live="polite">{lane.text}</div>
      )}
      {isError && lane.error && (
        <div class="race-track-lane-error" role="alert">{lane.error}</div>
      )}
      {lane.status === "done" && lane.finishRank === 1 && (
        <div class="race-track-lane-kachow" aria-hidden="true">Ka-chow!</div>
      )}
    </div>
  );
}
