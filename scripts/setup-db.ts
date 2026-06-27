/**
 * Create DynamoDB tables for the leaderboard.
 *
 * Local usage:
 *   1. docker compose up -d
 *   2. DYNAMODB_ENDPOINT=http://localhost:8000 npx tsx scripts/setup-db.ts
 *
 * Prod usage:
 *   AWS_REGION=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
 *   DYNAMODB_TABLE_PREFIX=iamspeed-prod npx tsx scripts/setup-db.ts
 */

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

const isLocal = !!process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(isLocal
    ? {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      }
    : {}),
});

const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "iamspeed-dev";

interface TableSpec {
  name: string;
  keySchema: { AttributeName: string; KeyType: "HASH" | "RANGE" }[];
  attributeDefinitions: { AttributeName: string; AttributeType: "S" | "N" }[];
  gsis?: {
    IndexName: string;
    KeySchema: { AttributeName: string; KeyType: "HASH" | "RANGE" }[];
    Projection: { ProjectionType: "ALL" | "KEYS_ONLY" };
  }[];
  ttlAttributeName?: string;
}

const TABLES: TableSpec[] = [
  {
    name: `${PREFIX}-simple-leaderboard`,
    keySchema: [
      { AttributeName: "id", KeyType: "HASH" },
    ],
    attributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "gsi1pk", AttributeType: "S" },
      { AttributeName: "gsi1sk", AttributeType: "N" },
      { AttributeName: "gsi2pk", AttributeType: "S" },
      { AttributeName: "gsi2sk", AttributeType: "N" },
    ],
    gsis: [
      {
        IndexName: "by-tps",
        KeySchema: [
          { AttributeName: "gsi1pk", KeyType: "HASH" },
          { AttributeName: "gsi1sk", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "by-provider",
        KeySchema: [
          { AttributeName: "gsi2pk", KeyType: "HASH" },
          { AttributeName: "gsi2sk", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  {
    name: `${PREFIX}-leaderboard-nonces`,
    keySchema: [
      { AttributeName: "nonce", KeyType: "HASH" },
    ],
    attributeDefinitions: [
      { AttributeName: "nonce", AttributeType: "S" },
    ],
    ttlAttributeName: "expiresAt",
  },
];

async function tableExists(name: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch {
    return false;
  }
}

/** Poll until the table is ACTIVE (DynamoDB tables are CREATING for a few seconds). */
async function waitForActive(name: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await client.send(new DescribeTableCommand({ TableName: name }));
    if (res.Table?.TableStatus === "ACTIVE") return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Table ${name} did not become ACTIVE within ${timeoutMs}ms`);
}

async function createTable(spec: TableSpec): Promise<void> {
  if (await tableExists(spec.name)) {
    // Ensure TTL is enabled even if table already existed
    if (spec.ttlAttributeName) {
      await enableTtl(spec.name, spec.ttlAttributeName);
    }
    console.log(`  ✓ ${spec.name} (already exists)`);
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: spec.name,
      KeySchema: spec.keySchema,
      AttributeDefinitions: spec.attributeDefinitions,
      // Production: on-demand (pay per request — cheaper for low/unknown traffic).
      // Local: provisioned (DynamoDB Local doesn't support on-demand).
      BillingMode: isLocal ? "PROVISIONED" : "PAY_PER_REQUEST",
      ...(isLocal
        ? {
            GlobalSecondaryIndexes: spec.gsis?.map((gsi) => ({
              ...gsi,
              ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 },
            })),
            ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 },
          }
        : {}),
    })
  );

  // Wait for the table to become ACTIVE before enabling TTL
  // (UpdateTimeToLive fails with ResourceNotFoundException if the table
  // is still in CREATING state).
  await waitForActive(spec.name);

  if (spec.ttlAttributeName) {
    await enableTtl(spec.name, spec.ttlAttributeName);
  }

  console.log(`  + ${spec.name} (created)`);
}

async function enableTtl(tableName: string, attributeName: string): Promise<void> {
  const { UpdateTimeToLiveCommand } = await import("@aws-sdk/client-dynamodb");
  await client.send(
    new UpdateTimeToLiveCommand({
      TableName: tableName,
      TimeToLiveSpecification: {
        AttributeName: attributeName,
        Enabled: true,
      },
    })
  );
}

async function main() {
  console.log(`Setting up DynamoDB tables (prefix: ${PREFIX})`);
  console.log(`Endpoint: ${isLocal ? process.env.DYNAMODB_ENDPOINT : "AWS production"}`);
  console.log();

  for (const spec of TABLES) {
    await createTable(spec);
  }

  console.log();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
