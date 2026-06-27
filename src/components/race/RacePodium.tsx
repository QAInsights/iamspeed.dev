/** @jsxImportSource preact */
import type { RaceResult } from "../../lib/race/types";
import { LANE_COLORS } from "../../lib/race/types";
import { rankResults } from "../../lib/race/ranking";
import { ShareButtons, SITE_URL } from "../ShareButtons";
import { Tooltip } from "../Tooltip";

interface RacePodiumProps {
  results: RaceResult[];
  /** Maps laneId -> provider display name. */
  providerNames: Record<string, string>;
  /** Maps laneId -> 0-based lane index for color. */
  laneIndexById: Record<string, number>;
}

const MEDALS = ["🏆", "🥈", "🥉"];

function buildRaceShareText(
  ranked: RaceResult[],
  providerNames: Record<string, string>,
  laneIndexById: Record<string, number>,
  fastestStart: RaceResult | null,
): string {
  const lines = ranked
    .filter((r) => r.tokenCount > 0)
    .slice(0, 3)
    .map((r, i) => {
      const color = LANE_COLORS[laneIndexById[r.laneId] ?? 0] ?? LANE_COLORS[0];
      const medal = MEDALS[i] ?? `${i + 1}.`;
      const tps = r.tps !== null ? `${r.tps} tok/s` : "--";
      const name = providerNames[r.laneId] ?? r.providerId;
      return `${medal} ${color.label} (${name} ${r.modelId}): ${tps}`;
    });
  if (lines.length === 0) return `🏁 Race results on iamspeed.dev\n\n${SITE_URL}`;
  const extras: string[] = [];
  if (fastestStart) {
    const color = LANE_COLORS[laneIndexById[fastestStart.laneId] ?? 0] ?? LANE_COLORS[0];
    const name = providerNames[fastestStart.laneId] ?? fastestStart.providerId;
    extras.push(`⚡ Fastest Start: ${color.label} (${name}): ${Math.round(fastestStart.ttft!)}ms TTFT`);
  }
  return `🏁 Piston Cup results on iamspeed.dev\n\n${lines.join("\n")}${extras.length ? "\n" + extras.join("\n") : ""}\n\n${SITE_URL}`;
}

/**
 * Pick the lane with the lowest non-null TTFT among lanes that actually
 * produced tokens. Returns null if no lane has a usable TTFT.
 */
function pickFastestStart(results: RaceResult[]): RaceResult | null {
  const candidates = results.filter((r) => r.tokenCount > 0 && r.ttft !== null);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) => (r.ttft! < best.ttft! ? r : best));
}

export function RacePodium({ results, providerNames, laneIndexById }: RacePodiumProps) {
  const ranked = rankResults(results);
  const fastestStart = pickFastestStart(results);
  const shareText = buildRaceShareText(ranked, providerNames, laneIndexById, fastestStart);

  const fastestColor = fastestStart
    ? LANE_COLORS[laneIndexById[fastestStart.laneId] ?? 0] ?? LANE_COLORS[0]
    : null;

  return (
    <div class="race-podium" role="group" aria-label="Race results">
      <div class="race-podium-title-row">
        <div class="race-podium-title">Piston Cup Results</div>
        <Tooltip label="Winner = first to finish (TTLT, time-to-last-token). Tiebreaker: tokens/sec. Fastest Start award = lowest TTFT. TTLT captures the full end-to-end wait; TPS alone rewards short answers and ignores first-token latency.">
          <span class="race-podium-info-toggle" aria-label="How is the winner decided?">?</span>
        </Tooltip>
      </div>

      {fastestStart && fastestColor && (
        <div class="race-podium-award" style={`--lane-color: ${fastestColor.hex};`}>
          <span class="race-podium-award-icon" aria-hidden="true">⚡</span>
          <span class="race-podium-award-label">Fastest Start</span>
          <span class="race-podium-award-name">{fastestColor.label}</span>
          <span class="race-podium-award-value">{Math.round(fastestStart.ttft!)}ms TTFT</span>
        </div>
      )}

      <ol class="race-podium-list">
        {ranked.map((r, i) => {
          const colorIdx = laneIndexById[r.laneId] ?? 0;
          const color = LANE_COLORS[colorIdx] ?? LANE_COLORS[0];
          const medal = MEDALS[i] ?? `${i + 1}.`;
          const raced = r.tokenCount > 0;
          const isFastestStart = fastestStart?.laneId === r.laneId;
          return (
            <li
              key={r.laneId}
              class={`race-podium-row${raced ? "" : " race-podium-row--dnf"}${isFastestStart ? " race-podium-row--fastest-start" : ""}`}
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
              {isFastestStart && (
                <span class="race-podium-row-badge" aria-label="Fastest start">⚡</span>
              )}
              {!raced && r.error && (
                <span class="race-podium-error">{r.error}</span>
              )}
            </li>
          );
        })}
      </ol>
      <ShareButtons shareText={shareText} ariaLabel="Share race results" />
    </div>
  );
}
