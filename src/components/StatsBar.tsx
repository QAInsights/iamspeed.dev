/**
 * StatsBar — aggregate leaderboard stats banner.
 *
 * Fetches from /api/stats on mount and renders a horizontal bar of
 * key metrics: total submissions, average TPS, fastest submission,
 * and provider distribution. Designed to sit between TopBar and
 * LeaderboardTable on the leaderboard page.
 */

/** @jsxImportSource preact */
import { useState, useEffect, useCallback } from "preact/hooks";
import { getSpeedGrade } from "../lib/grade";

export interface StatsData {
  totalSubmissions: number;
  avgTps: number;
  fastestTps: number;
  fastestModel: string;
  fastestProvider: string;
  providerCounts: Record<string, number>;
  regionCounts: Record<string, number>;
}

const EMPTY_STATS: StatsData = {
  totalSubmissions: 0,
  avgTps: 0,
  fastestTps: 0,
  fastestModel: "",
  fastestProvider: "",
  providerCounts: {},
  regionCounts: {},
};

export function StatsBar() {
  const [stats, setStats] = useState<StatsData>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) return;
      setStats(await res.json());
    } catch {
      // Silently fail — stats are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading || stats.totalSubmissions === 0) return null;

  const fastestGrade = stats.fastestTps > 0 ? getSpeedGrade(stats.fastestTps) : null;
  const topProviders = Object.entries(stats.providerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const totalProviderSubmissions = Object.values(stats.providerCounts)
    .reduce((sum, c) => sum + c, 0);

  return (
    <>
      <style>{style}</style>
      <div class="llm-stats-bar" role="region" aria-label="Leaderboard statistics">
        <div class="llm-stats-items">
          <StatItem
            icon="🌍"
            value={String(stats.totalSubmissions)}
            label="submissions"
          />
          <StatDivider />
          <StatItem
            icon="⚡"
            value={`${stats.avgTps.toFixed(1)}`}
            label="avg tok/s"
          />
          {stats.fastestTps > 0 && (
            <>
              <StatDivider />
              <StatItem
                icon={fastestGrade?.emoji ?? "🏆"}
                value={`${stats.fastestTps.toFixed(0)}`}
                label={`fastest (${stats.fastestProvider})`}
              />
            </>
          )}
        </div>

        {topProviders.length > 0 && totalProviderSubmissions > 0 && (
          <div class="llm-stats-providers">
            {topProviders.map(([provider, count]) => (
              <span key={provider} class="llm-stats-provider-pill">
                {provider}
                <span class="llm-stats-provider-count">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatItem({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div class="llm-stats-item">
      <span class="llm-stats-icon" aria-hidden="true">{icon}</span>
      <span class="llm-stats-value">{value}</span>
      <span class="llm-stats-label">{label}</span>
    </div>
  );
}

function StatDivider() {
  return <span class="llm-stats-divider" aria-hidden="true" />;
}

const style = `
  .llm-stats-bar {
    width: 100%;
    max-width: var(--max-w);
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: fade-in 0.3s ease-out;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .llm-stats-items {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .llm-stats-item {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
  .llm-stats-icon {
    font-size: 0.875rem;
  }
  .llm-stats-value {
    font-family: var(--mono);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .llm-stats-label {
    font-family: var(--mono);
    font-size: 0.6875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .llm-stats-divider {
    width: 1px;
    height: 1rem;
    background: var(--border);
  }
  .llm-stats-providers {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .llm-stats-provider-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1875rem 0.5rem;
    font-family: var(--mono);
    font-size: 0.5625rem;
    font-weight: 500;
    color: var(--text-muted);
    background: var(--border-light);
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .llm-stats-provider-count {
    font-weight: 600;
    color: var(--text);
  }
`;
