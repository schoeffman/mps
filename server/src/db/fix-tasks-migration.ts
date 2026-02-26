/**
 * Run this if `db:migrate` fails with "relation tasks does not exist".
 *
 * It creates the tasks table if it's missing (so the pending migrations can run),
 * then marks migration 0001 as applied if it isn't already.
 *
 * After running this script, run `db:migrate` normally.
 *
 * Usage:
 *   npx tsx src/db/fix-tasks-migration.ts
 *   DATABASE_URL=<railway-url> npx tsx src/db/fix-tasks-migration.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/mps",
});

await client.connect();

// 1. Ensure the drizzle migrations table exists
await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await client.query(`
  CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
    id        SERIAL PRIMARY KEY,
    hash      text NOT NULL,
    created_at bigint
  )
`);

// 2. Create the tasks table if it doesn't exist
const { rows: tableRows } = await client.query(`
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'tasks'
`);

if (tableRows.length === 0) {
  console.log("tasks table not found — creating it...");
  await client.query(`
    CREATE TABLE "tasks" (
      "id"          serial PRIMARY KEY NOT NULL,
      "title"       text NOT NULL,
      "description" text DEFAULT '' NOT NULL,
      "owner_id"    text NOT NULL,
      "created_at"  timestamp DEFAULT now() NOT NULL
    )
  `);
  await client.query(`
    ALTER TABLE "tasks"
      ADD CONSTRAINT "tasks_owner_id_user_id_fk"
      FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id")
      ON DELETE no action ON UPDATE no action
  `);
  console.log("✓ tasks table created.");
} else {
  console.log("tasks table already exists — skipping creation.");
}

// 3. Mark migration 0001 as applied if it isn't already
const migration0001Path = path.resolve(__dirname, "../../drizzle/0001_worthless_thena.sql");
const migration0001Sql = fs.readFileSync(migration0001Path, "utf8");
const hash0001 = crypto.createHash("sha256").update(migration0001Sql).digest("hex");

const { rows: hashRows } = await client.query(
  `SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = $1`,
  [hash0001],
);

if (hashRows.length === 0) {
  await client.query(
    `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
    [hash0001, Date.now()],
  );
  console.log("✓ Migration 0001 marked as applied.");
} else {
  console.log("Migration 0001 already marked as applied.");
}

await client.end();

console.log("\nDone. Now run: DATABASE_URL=<railway-url> npm run db:migrate -w server");
