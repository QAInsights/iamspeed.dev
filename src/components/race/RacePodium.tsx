/** @jsxImportSource preact */
import type { RaceResult } from "../../lib/race/types";
import { LANE_COLORS } from "../../lib/race/types";
import { rankResults } from "../../lib/race/ranking";

interface RacePodiumProps {
  results: RaceResult[];
  /** Maps laneId -> provider display name. */
  providerNames: Record<string, string>;
  /** Maps laneId -> 0-based lane index for color. */
  laneIndexById: Record<string, number>;
}

const MEDALS = ["🏆", "🥈", "🥉"];

export function RacePodium({ results, providerNames, laneIndexById }: RacePodiumProps) {
  const ranked = rankResults(results);
  return (
    <div class="race-podium" role="group" aria-label="Race results">
      <div class="race-podium-title">Piston Cup Results</div>
      <ol class="race-podium-list">
        {ranked.map((r, i) => {
          const colorIdx = laneIndexById[r.laneId] ?? 0;
          const color = LANE_COLORS[colorIdx] ?? LANE_COLORS[0];
          const medal = MEDALS[i] ?? `${i + 1}.`;
          const raced = r.tokenCount > 0;
          return (
            <li
              key={r.laneId}
              class={`race-podium-row${raced ? "" : " race-podium-row--dnf"}`}
              style={`--lane-color: ${color.hex};`}
            >
              <span class="race-podium-medal" aria-hidden="true">{medal}</span>
              <span class="race-podium-name">{color.label}</span>
              <span class="race-podium-model">
                {providerNames[r.laneId] ?? r.providerId} · {r.modelId}
              </span>
              <span class="race-podium-tps">
                {r.tps !== null ? `${r.tps} tok/s` : "--"}
              </span>
              <span class="race-podium-ttft">
                {r.ttft !== null ? `${Math.round(r.ttft)}ms TTFT` : "--"}
              </span>
              {!raced && r.error && (
                <span class="race-podium-error">{r.error}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
