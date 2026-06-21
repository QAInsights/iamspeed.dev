/** @jsxImportSource preact */
import type { LaneState } from "../../lib/race/types";
import { RaceTrackLane } from "./RaceTrackLane";

interface RaceTrackProps {
  lanes: LaneState[];
  /** Maps laneId -> provider display name. */
  providerNames: Record<string, string>;
}

/**
 * Race track — N horizontal lanes, one per racer. Cars start at the left
 * (start line) and drive right toward a checkered finish line. Position is
 * derived per-render from each lane's live metrics relative to the current
 * token leader; no animation loop or rAF is required.
 */
export function RaceTrack({ lanes, providerNames }: RaceTrackProps) {
  const leaderTokens = lanes.reduce((max, l) => Math.max(max, l.tokenCount), 0);
  return (
    <div class="race-track" role="group" aria-label="Race track">
      {lanes.map((lane, i) => (
        <RaceTrackLane
          key={lane.laneId}
          lane={lane}
          laneIndex={i}
          leaderTokens={leaderTokens}
          providerDisplayName={providerNames[lane.laneId] ?? lane.providerId}
        />
      ))}
    </div>
  );
}
