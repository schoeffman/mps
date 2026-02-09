import { db, pool } from "./index.js";
import { users, teams, teamMembers, projects, projectMembers, schedules, scheduleAssignments } from "./schema.js";
import { seedDemoDataForOwner } from "./seed-demo-data.js";

const OWNER_ID = process.env.OWNER_ID;

async function seed() {
  // Clear existing data (FK-safe order)
  await db.delete(scheduleAssignments);
  await db.delete(schedules);
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(teamMembers);
  await db.delete(teams);
  await db.delete(users);

  console.log("Cleared app data.");

  if (!OWNER_ID) {
    console.log("No OWNER_ID env var set — skipping app data seeding.");
    console.log("To seed: OWNER_ID=<auth-user-id> npm run db:seed");
    await pool.end();
    return;
  }

  await seedDemoDataForOwner(OWNER_ID);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
