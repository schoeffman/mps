import { db, pool } from "./index.js";
import { users, teams, teamMembers, projects, projectMembers, schedules, scheduleAssignments, workHistory, authUser } from "./schema.js";
import { seedDemoDataForOwner } from "./seed-demo-data.js";

const autoDetect = process.argv.includes("--auto");

async function seed() {
  // Clear existing data (FK-safe order)
  await db.delete(workHistory);
  await db.delete(scheduleAssignments);
  await db.delete(schedules);
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(teamMembers);
  await db.delete(teams);
  await db.delete(users);

  console.log("Cleared app data.");

  let ownerId = process.env.OWNER_ID;

  if (!ownerId && autoDetect) {
    const [firstUser] = await db.select({ id: authUser.id }).from(authUser).limit(1);
    if (firstUser) {
      ownerId = firstUser.id;
      console.log(`Auto-detected owner: ${ownerId}`);
    }
  }

  if (!ownerId) {
    console.log("No OWNER_ID env var set — skipping app data seeding.");
    console.log("To seed: OWNER_ID=<auth-user-id> npm run db:seed");
    console.log("Or run: npm run db:reseed (auto-detects first auth user)");
    await pool.end();
    return;
  }

  await seedDemoDataForOwner(ownerId);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
