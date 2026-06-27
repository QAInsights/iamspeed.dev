/**
 * DynamoDB atomic-counter stats for the leaderboard.
 *
 * Stores a single aggregate row (PK = "STATS#GLOBAL") in the same
 * `simple_leaderboard` table. Uses `ADD` expressions so concurrent
 * submissions never race — every update is atomic.
 *
 * The gsi1pk is set to "META" so the by-tps GSI (which queries
 * gsi1pk="SIMPLE") never picks up this item.
 *
 * Read is a single GetItem (O(1), <5ms).
 */

import { UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "./db";

const STATS_PK = "STATS#GLOBAL";
const STATS_GSI1PK = "META";

export interface GlobalStats {
  totalSubmissions: number;
  totalTpsCumulative: number;
  fastestTps: number;
  fastestModel: string;
  fastestProvider: string;
  providerCounts: Record<string, number>;
  regionCounts: Record<string, number>;
}

/**
 * Ensures the stats row exists with initialized empty maps and counters.
 * Uses a conditional put so it only writes if the item doesn't exist.
 */
async function ensureStatsInitialized(): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLES.leaderboard,
        Item: {
          id: STATS_PK,
          gsi1pk: STATS_GSI1PK,
          gsi1sk: 0,
          totalSubmissions: 0,
          totalTpsCumulative: 0,
          fastestTps: 0,
          fastestModel: "",
          fastestProvider: "",
          providerCounts: {},
          regionCounts: {},
        },
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name !== "ConditionalCheckFailedException") {
      throw err;
    }
  }
}

/**
 * Atomically increment counters on every submission.
 * Two separate updates: counters (always) and fastest-record (conditional).
 */
export async function updateStats(
  tps: number,
  provider: string,
  model: string,
  region: string,
): Promise<void> {
  // Ensure table item is initialized first
  await ensureStatsInitialized();

  // 1. Always-succeed counter update
  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.leaderboard,
      Key: { id: STATS_PK },
      UpdateExpression: `
        ADD totalSubmissions :one,
            totalTpsCumulative :tps,
            providerCounts.#prov :one,
            regionCounts.#reg :one
      `,
      ExpressionAttributeNames: {
        "#prov": provider,
        "#reg": region,
      },
      ExpressionAttributeValues: {
        ":one": 1,
        ":tps": tps,
      },
    }),
  );

  // 2. Conditionally update fastest record (only if this is a new high score)
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.leaderboard,
        Key: { id: STATS_PK },
        UpdateExpression: `
          SET fastestTps = :tps,
              fastestModel = :model,
              fastestProvider = :prov
        `,
        ConditionExpression:
          "attribute_not_exists(fastestTps) OR :tps > fastestTps",
        ExpressionAttributeValues: {
          ":tps": tps,
          ":model": model,
          ":prov": provider,
        },
      }),
    );
  } catch (err: unknown) {
    // ConditionalCheckFailedException = not a new record, expected
    const code = (err as { name?: string }).name;
    if (code !== "ConditionalCheckFailedException") throw err;
  }
}

export async function getStats(): Promise<GlobalStats | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.leaderboard,
      Key: { id: STATS_PK },
    }),
  );

  if (!result.Item) return null;

  return {
    totalSubmissions: result.Item.totalSubmissions ?? 0,
    totalTpsCumulative: result.Item.totalTpsCumulative ?? 0,
    fastestTps: result.Item.fastestTps ?? 0,
    fastestModel: result.Item.fastestModel ?? "",
    fastestProvider: result.Item.fastestProvider ?? "",
    providerCounts: result.Item.providerCounts ?? {},
    regionCounts: result.Item.regionCounts ?? {},
  };
}
