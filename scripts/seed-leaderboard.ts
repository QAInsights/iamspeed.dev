/**
 * Database Seeder Script.
 *
 * Populates the simple_leaderboard table and updates aggregate statistics
 * with realistic test data.
 *
 * Run with: npx tsx scripts/seed-leaderboard.ts
 */

import "dotenv/config";
import { insertEntry } from "../src/lib/server/leaderboardRepository";
import { updateStats } from "../src/lib/server/statsRepository";
import { getSpeedGrade } from "../src/lib/grade";

const SEED_HANDLES = [
  "neon_panther_2091", "electric_falcon_8829", "turbo_viper_1120",
  "cosmic_hawk_9091", "quantum_runner_4560", "cobalt_rider_7733",
  "midnight_mustang_1290", "obsidian_fox_5002", "ember_wolf_9381",
  "golden_phoenix_8844", "silver_tiger_3322", "blaze_scout_1044",
  "storm_driver_2031", "arctic_raptor_7781", "cyber_drake_9901"
];

const SEED_REGIONS = [
  "Americas-E", "Americas-W", "EU-West", "EU-Central",
  "AP-South", "AP-East", "AP-SE", "Oceania", "Africa"
];

const SEED_PROVIDERS = [
  {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    tpsMin: 220, tpsMax: 350,
    ttftMin: 120, ttftMax: 280
  },
  {
    provider: "groq",
    model: "llama-3.1-8b-instant",
    tpsMin: 450, tpsMax: 580,
    ttftMin: 80, ttftMax: 180
  },
  {
    provider: "cerebras",
    model: "llama-3.1-8b",
    tpsMin: 1600, tpsMax: 2100,
    ttftMin: 50, ttftMax: 120
  },
  {
    provider: "cerebras",
    model: "llama-3.3-70b",
    tpsMin: 850, tpsMax: 1100,
    ttftMin: 60, ttftMax: 150
  },
  {
    provider: "openai",
    model: "gpt-4o-mini",
    tpsMin: 80, tpsMax: 120,
    ttftMin: 180, ttftMax: 350
  },
  {
    provider: "openai",
    model: "gpt-4o",
    tpsMin: 55, tpsMax: 85,
    ttftMin: 220, ttftMax: 450
  },
  {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    tpsMin: 65, tpsMax: 95,
    ttftMin: 280, ttftMax: 600
  },
  {
    provider: "fireworks",
    model: "llama-3.3-70b-instruct",
    tpsMin: 120, tpsMax: 240,
    ttftMin: 150, ttftMax: 300
  },
  {
    provider: "google",
    model: "gemini-1.5-flash",
    tpsMin: 100, tpsMax: 150,
    ttftMin: 250, ttftMax: 500
  }
];

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomSelect<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("⚡ Starting database seeding process...");
  
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const base = randomSelect(SEED_PROVIDERS);
    const tps = parseFloat(randomRange(base.tpsMin, base.tpsMax).toFixed(1));
    const ttft = Math.round(randomRange(base.ttftMin, base.ttftMax));
    const outputTokens = Math.round(randomRange(50, 250));
    const ttlt = ttft + Math.round((outputTokens / tps) * 1000);

    const payload = {
      handle: randomSelect(SEED_HANDLES),
      deviceHash: `seed_device_hash_${Math.floor(Math.random() * 10000)}`,
      region: randomSelect(SEED_REGIONS),
      provider: base.provider,
      model: base.model,
      tps,
      ttft,
      ttlt,
      inputTokens: Math.round(randomRange(10, 50)),
      outputTokens,
      promptLength: 28,
      grade: getSpeedGrade(tps).label
    };

    try {
      await insertEntry(payload);
      await updateStats(tps, base.provider, base.model, payload.region);
      count++;
      console.log(`[${count}/30] Seeded submission for ${payload.handle} with ${tps} tok/s`);
    } catch (err) {
      console.error(`Failed to seed record ${i}:`, err);
    }
  }

  console.log(`🏁 Successfully seeded ${count} mock submissions into DynamoDB.`);
}

seed().catch(console.error);
