/**
 * Shared DynamoDB client. Auto-detects local vs production:
 *
 * - Local:  DYNAMODB_ENDPOINT env var (e.g. http://localhost:8000)
 *           Uses static fake credentials (DynamoDB Local ignores them).
 * - Prod:   Real AWS credentials from Vercel env vars.
 *
 * Both paths use the same @aws-sdk/client-dynamodb + lib-dynamodb, so
 * application code is identical between environments.
 */

import "dotenv/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isLocal = !!process.env.DYNAMODB_ENDPOINT;

export const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "iamspeed-dev";

export function tableName(shortName: string): string {
  return `${TABLE_PREFIX}-${shortName}`;
}

export const TABLES = {
  leaderboard: tableName("simple-leaderboard"),
  nonces: tableName("leaderboard-nonces"),
} as const;

export const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(isLocal
    ? {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      }
    : {}),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});
