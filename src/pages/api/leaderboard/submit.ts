import type { APIRoute } from "astro";
import { insertEntry, type SubmitPayload } from "../../../lib/server/leaderboardRepository";
import { PROVIDERS } from "../../../lib/config";
import { getSpeedGrade } from "../../../lib/grade";
import { updateStats } from "../../../lib/server/statsRepository";

export const prerender = false;

// Basic sanity validation — no token signing yet (trust layer comes later)
const MAX_TPS = 2000;
const MIN_TPS = 0.1;
const MAX_TTFT = 30000; // 30s
const MAX_TTLT = 120000; // 2 min
const MAX_HANDLE_LENGTH = 50;
const MAX_MODEL_LENGTH = 200;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ["handle", "deviceHash", "provider", "model", "tps"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return jsonError(400, `Missing required field: ${field}`);
      }
    }

    // Validate types and ranges
    if (typeof body.tps !== "number" || body.tps < MIN_TPS || body.tps > MAX_TPS) {
      return jsonError(400, `tps must be between ${MIN_TPS} and ${MAX_TPS}`);
    }
    if (typeof body.ttft !== "number" || body.ttft < 0 || body.ttft > MAX_TTFT) {
      return jsonError(400, "ttft out of plausible range");
    }
    if (typeof body.ttlt !== "number" || body.ttlt < 0 || body.ttlt > MAX_TTLT) {
      return jsonError(400, "ttlt out of plausible range");
    }
    if (typeof body.handle !== "string" || body.handle.length > MAX_HANDLE_LENGTH) {
      return jsonError(400, "Invalid handle");
    }
    if (typeof body.model !== "string" || body.model.length > MAX_MODEL_LENGTH) {
      return jsonError(400, "Invalid model");
    }

    // Validate provider is known
    if (!PROVIDERS[body.provider]) {
      return jsonError(400, `Unknown provider: ${body.provider}`);
    }

    const payload: SubmitPayload = {
      handle: body.handle,
      deviceHash: body.deviceHash,
      region: body.region || "Other",
      provider: body.provider,
      model: body.model,
      tps: body.tps,
      ttft: body.ttft,
      ttlt: body.ttlt,
      inputTokens: body.inputTokens ?? null,
      outputTokens: body.outputTokens ?? null,
      promptLength: body.promptLength ?? 0,
      grade: getSpeedGrade(body.tps).label,
    };

    const row = await insertEntry(payload);

    // Update aggregate stats — fire-and-forget so a stats failure never blocks submission
    updateStats(payload.tps, payload.provider, payload.model, payload.region)
      .catch((err) => console.error("Stats update failed (non-blocking):", err));

    return new Response(JSON.stringify({ success: true, id: row.id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Submit error:", err);
    return jsonError(500, "Failed to submit entry");
  }
};

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
