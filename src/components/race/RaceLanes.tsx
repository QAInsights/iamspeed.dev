/** @jsxImportSource preact */
import type { LaneState } from "../../lib/race/types";
import { RaceLaneCard } from "./RaceLaneCard";

interface RaceLanesProps {
  lanes: LaneState[];
  /** Maps laneId -> provider display name. */
  providerNames: Record<string, string>;
}

export function RaceLanes({ lanes, providerNames }: RaceLanesProps) {
  return (
    <div class="race-lanes" role="group" aria-label="Race lanes">
      {lanes.map((lane, i) => (
        <RaceLaneCard
          key={lane.laneId}
          lane={lane}
          laneIndex={i}
          providerDisplayName={providerNames[lane.laneId] ?? lane.providerId}
        />
      ))}
    </div>
  );
}
