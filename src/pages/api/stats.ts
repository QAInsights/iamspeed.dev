import type { APIRoute } from "astro";
import { getStats } from "../../lib/server/statsRepository";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const stats = await getStats();

    if (!stats) {
      return jsonOk({
        totalSubmissions: 0,
        avgTps: 0,
        fastestTps: 0,
        fastestModel: "",
        fastestProvider: "",
        providerCounts: {},
        regionCounts: {},
      });
    }

    const avgTps =
      stats.totalSubmissions > 0
        ? Math.round((stats.totalTpsCumulative / stats.totalSubmissions) * 10) / 10
        : 0;

    return jsonOk({ ...stats, avgTps });
  } catch (err) {
    console.error("Stats fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch stats" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
