import { db } from "./index.js";
import { users, teams, teamMembers } from "./schema.js";

const seedUsers = [
  { fullName: "Alice Chen", craftAbility: "Engineering", jobLevel: "Senior", craftFocus: "Frontend" },
  { fullName: "Bob Martinez", craftAbility: "Engineering", jobLevel: "Staff", craftFocus: "Backend" },
  { fullName: "Carol Nguyen", craftAbility: "Design", jobLevel: "Mid", craftFocus: "Not Applicable" },
  { fullName: "David Kim", craftAbility: "Engineering", jobLevel: "Junior", craftFocus: "Fullstack" },
  { fullName: "Elena Popov", craftAbility: "Product Management", jobLevel: "Senior", craftFocus: "Not Applicable" },
  { fullName: "Frank O'Brien", craftAbility: "Data Science", jobLevel: "Mid", craftFocus: "Backend" },
  { fullName: "Grace Tanaka", craftAbility: "Engineering", jobLevel: "Principal", craftFocus: "Infrastructure" },
  { fullName: "Hassan Ali", craftAbility: "Design", jobLevel: "Senior", craftFocus: "Mobile" },
  { fullName: "Iris Johansson", craftAbility: "Engineering", jobLevel: "Mid", craftFocus: "Mobile" },
  { fullName: "James Wright", craftAbility: "Product Management", jobLevel: "Staff", craftFocus: "Not Applicable" },
  { fullName: "Karen Liu", craftAbility: "Data Science", jobLevel: "Senior", craftFocus: "Infrastructure" },
  { fullName: "Leo Santos", craftAbility: "Engineering", jobLevel: "Junior", craftFocus: "Frontend" },
  { fullName: "Maya Patel", craftAbility: "Design", jobLevel: "Junior", craftFocus: "Not Applicable" },
  { fullName: "Nathan Fischer", craftAbility: "Engineering", jobLevel: "Staff", craftFocus: "Fullstack" },
  { fullName: "Olivia Dupont", craftAbility: "Data Science", jobLevel: "Principal", craftFocus: "Backend" },
];

// Clear existing data (FK-safe order)
db.delete(teamMembers).run();
db.delete(teams).run();
db.delete(users).run();

// Insert users
const insertedUsers = db.insert(users).values(seedUsers).returning().all();
console.log(`Seeded ${insertedUsers.length} users.`);

// Build a lookup by name
const userByName = Object.fromEntries(insertedUsers.map((u) => [u.fullName, u]));

// Seed teams
const seedTeams = [
  { name: "Frontend Platform", leadName: "Alice Chen" },
  { name: "Backend Services", leadName: "Bob Martinez" },
  { name: "Design Systems", leadName: "Carol Nguyen" },
  { name: "Data & Analytics", leadName: "Karen Liu" },
];

const insertedTeams = db
  .insert(teams)
  .values(
    seedTeams.map((t) => ({
      name: t.name,
      teamLeadId: userByName[t.leadName].id,
    })),
  )
  .returning()
  .all();
console.log(`Seeded ${insertedTeams.length} teams.`);

const teamByName = Object.fromEntries(insertedTeams.map((t) => [t.name, t]));

// Seed team memberships
const memberships: { teamId: number; userId: number }[] = [
  // Frontend Platform: Alice (lead), David, Leo, Iris
  { teamId: teamByName["Frontend Platform"].id, userId: userByName["Alice Chen"].id },
  { teamId: teamByName["Frontend Platform"].id, userId: userByName["David Kim"].id },
  { teamId: teamByName["Frontend Platform"].id, userId: userByName["Leo Santos"].id },
  { teamId: teamByName["Frontend Platform"].id, userId: userByName["Iris Johansson"].id },
  // Backend Services: Bob (lead), Nathan, Grace, Frank
  { teamId: teamByName["Backend Services"].id, userId: userByName["Bob Martinez"].id },
  { teamId: teamByName["Backend Services"].id, userId: userByName["Nathan Fischer"].id },
  { teamId: teamByName["Backend Services"].id, userId: userByName["Grace Tanaka"].id },
  { teamId: teamByName["Backend Services"].id, userId: userByName["Frank O'Brien"].id },
  // Design Systems: Carol (lead), Hassan, Maya
  { teamId: teamByName["Design Systems"].id, userId: userByName["Carol Nguyen"].id },
  { teamId: teamByName["Design Systems"].id, userId: userByName["Hassan Ali"].id },
  { teamId: teamByName["Design Systems"].id, userId: userByName["Maya Patel"].id },
  // Data & Analytics: Karen (lead), Olivia, Elena
  { teamId: teamByName["Data & Analytics"].id, userId: userByName["Karen Liu"].id },
  { teamId: teamByName["Data & Analytics"].id, userId: userByName["Olivia Dupont"].id },
  { teamId: teamByName["Data & Analytics"].id, userId: userByName["Elena Popov"].id },
];

db.insert(teamMembers).values(memberships).run();
console.log(`Seeded ${memberships.length} team memberships.`);
