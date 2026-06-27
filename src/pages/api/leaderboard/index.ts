import type { APIRoute } from "astro";
import { getTopEntries, getByProvider } from "../../../lib/server/leaderboardRepository";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;
    const provider = url.searchParams.get("provider");

    const entries = provider
      ? await getByProvider(provider, limit)
      : await getTopEntries(limit);

    // Add rank based on position (already sorted by TPS desc)
    const ranked = entries.map((entry, i) => ({
      ...entry,
      rank: i + 1,
    }));

    return new Response(JSON.stringify(ranked), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch leaderboard" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
