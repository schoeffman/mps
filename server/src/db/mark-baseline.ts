/**
 * Run this ONCE on any database that already has the schema applied
 * before the migration system was introduced.
 *
 * It marks 0000_baseline.sql as already applied in Drizzle's migrations
 * table so that `db:migrate` will only run new migrations going forward.
 *
 * Usage:
 *   npx tsx src/db/mark-baseline.ts
 *   DATABASE_URL=<railway-url> npx tsx src/db/mark-baseline.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "../../drizzle/0000_baseline.sql");
const sql = fs.readFileSync(sqlPath, "utf8");
const hash = crypto.createHash("sha256").update(sql).digest("hex");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/mps",
});

await client.connect();

await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await client.query(`
  CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
    id      SERIAL PRIMARY KEY,
    hash    text NOT NULL,
    created_at bigint
  )
`);

const { rows } = await client.query(
  `SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = $1`,
  [hash],
);

if (rows.length > 0) {
  console.log("Baseline already marked as applied — nothing to do.");
} else {
  await client.query(
    `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
    [hash, Date.now()],
  );
  console.log("✓ Baseline migration marked as applied.");
}

await client.end();
