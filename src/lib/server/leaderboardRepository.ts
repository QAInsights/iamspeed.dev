/**
 * DynamoDB repository for the Simple-mode leaderboard.
 *
 * All DB operations live here so API routes stay thin. Uses the shared
 * docClient from db.ts which auto-detects local vs production.
 */

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "./db";
import { randomUUID } from "crypto";

export interface LeaderboardRow {
  id: string;
  handle: string;
  deviceHash: string;
  region: string;
  provider: string;
  model: string;
  tps: number;
  ttft: number;
  ttlt: number;
  inputTokens: number | null;
  outputTokens: number | null;
  promptLength: number;
  createdAt: string; // ISO timestamp
}

export interface SubmitPayload {
  handle: string;
  deviceHash: string;
  region: string;
  provider: string;
  model: string;
  tps: number;
  ttft: number;
  ttlt: number;
  inputTokens: number | null;
  outputTokens: number | null;
  promptLength: number;
}

/**
 * Insert a new leaderboard entry. Uses gsi1pk="SIMPLE" + gsi1sk=tps for the
 * by-tps global secondary index (top-N sorted by TPS descending).
 */
export async function insertEntry(payload: SubmitPayload): Promise<LeaderboardRow> {
  const row: LeaderboardRow = {
    id: randomUUID(),
    handle: payload.handle,
    deviceHash: payload.deviceHash,
    region: payload.region,
    provider: payload.provider,
    model: payload.model,
    tps: payload.tps,
    ttft: payload.ttft,
    ttlt: payload.ttlt,
    inputTokens: payload.inputTokens,
    outputTokens: payload.outputTokens,
    promptLength: payload.promptLength,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.leaderboard,
      Item: {
        ...row,
        gsi1pk: "SIMPLE",
        gsi1sk: row.tps,
        gsi2pk: row.provider,
        gsi2sk: row.tps,
      },
    })
  );

  return row;
}

/**
 * Fetch top-N entries sorted by TPS descending.
 * Uses the by-tps GSI (gsi1pk="SIMPLE", gsi1sk=tps).
 *
 * DynamoDB GSI queries return ascending sort by default. To get descending,
 * we set ScanIndexForward=false.
 */
export async function getTopEntries(limit = 50): Promise<LeaderboardRow[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.leaderboard,
      IndexName: "by-tps",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "SIMPLE",
      },
      ScanIndexForward: false, // descending = highest TPS first
      Limit: limit,
    })
  );

  if (!result.Items || result.Items.length === 0) return [];

  return result.Items.map(stripIndexKeys) as LeaderboardRow[];
}

/** Remove GSI helper keys from the returned item. */
function stripIndexKeys(item: Record<string, unknown>): LeaderboardRow {
  const rest = { ...item };
  delete rest.gsi1pk;
  delete rest.gsi1sk;
  delete rest.gsi2pk;
  delete rest.gsi2sk;
  return rest as unknown as LeaderboardRow;
}
