/**
 * Switch existing DynamoDB tables from provisioned to on-demand billing.
 *
 * Usage:
 *   AWS_REGION=us-east-1 npx tsx scripts/switch-to-ondemand.ts
 *
 * On-demand is cheaper for low/unknown traffic — you only pay for actual
 * reads/writes instead of provisioned capacity 24/7.
 */

import { DynamoDBClient, UpdateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "iamspeed-prod";
const tables = [`${PREFIX}-simple-leaderboard`, `${PREFIX}-leaderboard-nonces`];

async function main() {
  console.log(`Switching tables to on-demand (prefix: ${PREFIX})`);
  for (const table of tables) {
    try {
      await client.send(
        new UpdateTableCommand({
          TableName: table,
          BillingMode: "PAY_PER_REQUEST",
        })
      );
      console.log(`  ~ ${table} → on-demand`);
    } catch (err) {
      console.log(`  ! ${table}: ${(err as Error).message}`);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
