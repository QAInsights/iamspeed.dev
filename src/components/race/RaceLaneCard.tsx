/** @jsxImportSource preact */
import type { LaneState } from "../../lib/race/types";
import { LANE_COLORS } from "../../lib/race/types";

interface RaceLaneCardProps {
  lane: LaneState;
  /** 0-based lane index, maps to LANE_COLORS. */
  laneIndex: number;
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

function finishBadge(rank: number | null): string | null {
  if (rank === null) return null;
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export function RaceLaneCard({ lane, laneIndex, providerDisplayName }: RaceLaneCardProps) {
  const color = LANE_COLORS[laneIndex] ?? LANE_COLORS[0];
  const badge = finishBadge(lane.finishRank);
  const isRunning = lane.status === "running";
  const isDone = lane.status === "done";
  const isError = lane.status === "error";
  const showText = lane.text.length > 0;

  return (
    <div
      class={`race-lane race-lane--${lane.status}`}
      style={`--lane-color: ${color.hex};`}
      data-lane-id={lane.laneId}
    >
      <div class="race-lane-stripe" aria-hidden="true">
        <span class="race-lane-number">{laneIndex + 1}</span>
      </div>
      <div class="race-lane-body">
        <div class="race-lane-header">
          <span class="race-lane-name">{color.label}</span>
          <span class="race-lane-model">{providerDisplayName} · {lane.modelId}</span>
          {badge && <span class="race-lane-badge" aria-label={`Finish rank ${lane.finishRank}`}>{badge}</span>}
        </div>
        <div class="race-lane-metrics">
          <div class="race-lane-tps">
            <span class="race-lane-tps-value">{formatTps(lane.tps)}</span>
            <span class="race-lane-tps-unit">tok/s</span>
          </div>
          <div class="race-lane-secondary">
            <span class="race-lane-ttft">{formatMs(lane.ttft)} <span class="race-lane-secondary-label">TTFT</span></span>
            <span class="race-lane-tokens">{lane.tokenCount} <span class="race-lane-secondary-label">tok</span></span>
          </div>
        </div>
        {isRunning && lane.providerQueued && lane.ttft === null && (
          <div class="race-lane-status" role="status">Queued at provider…</div>
        )}
        {isRunning && !lane.providerQueued && lane.ttft === null && (
          <div class="race-lane-status" role="status">Waiting for first token…</div>
        )}
        {showText && (
          <div class="race-lane-text" aria-live="polite">{lane.text}</div>
        )}
        {isError && lane.error && (
          <div class="race-lane-error" role="alert">{lane.error}</div>
        )}
        {isDone && lane.finishRank === 1 && (
          <div class="race-lane-kachow" aria-hidden="true">Ka-chow!</div>
        )}
      </div>
    </div>
  );
}
