import { db } from "./index.js";
import { users, teams, teamMembers, projects, projectMembers, schedules, scheduleAssignments } from "./schema.js";

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
db.delete(scheduleAssignments).run();
db.delete(schedules).run();
db.delete(projectMembers).run();
db.delete(projects).run();
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
const teamMemberships: { teamId: number; userId: number }[] = [
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

db.insert(teamMembers).values(teamMemberships).run();
console.log(`Seeded ${teamMemberships.length} team memberships.`);

// Seed projects
const seedProjects = [
  { name: "Website Redesign", targetDate: "2026-04-15", driName: "Alice Chen", status: "Make" },
  { name: "API v2 Migration", targetDate: "2026-05-01", driName: "Bob Martinez", status: "Explore" },
  { name: "Mobile App Launch", targetDate: "2026-06-30", driName: "Hassan Ali", status: "Explore" },
  { name: "Data Pipeline Upgrade", targetDate: "2026-03-15", driName: "Karen Liu", status: "Complete" },
];

const insertedProjects = db
  .insert(projects)
  .values(
    seedProjects.map((p) => ({
      name: p.name,
      targetDate: p.targetDate,
      driId: userByName[p.driName].id,
      status: p.status,
    })),
  )
  .returning()
  .all();
console.log(`Seeded ${insertedProjects.length} projects.`);

const projectByName = Object.fromEntries(insertedProjects.map((p) => [p.name, p]));

// Seed project memberships
const projectMemberships: { projectId: number; userId: number }[] = [
  // Website Redesign: Alice (DRI), Carol, Leo, Maya
  { projectId: projectByName["Website Redesign"].id, userId: userByName["Alice Chen"].id },
  { projectId: projectByName["Website Redesign"].id, userId: userByName["Carol Nguyen"].id },
  { projectId: projectByName["Website Redesign"].id, userId: userByName["Leo Santos"].id },
  { projectId: projectByName["Website Redesign"].id, userId: userByName["Maya Patel"].id },
  // API v2 Migration: Bob (DRI), Nathan, Grace, Elena
  { projectId: projectByName["API v2 Migration"].id, userId: userByName["Bob Martinez"].id },
  { projectId: projectByName["API v2 Migration"].id, userId: userByName["Nathan Fischer"].id },
  { projectId: projectByName["API v2 Migration"].id, userId: userByName["Grace Tanaka"].id },
  { projectId: projectByName["API v2 Migration"].id, userId: userByName["Elena Popov"].id },
  // Mobile App Launch: Hassan (DRI), Iris, David, Carol
  { projectId: projectByName["Mobile App Launch"].id, userId: userByName["Hassan Ali"].id },
  { projectId: projectByName["Mobile App Launch"].id, userId: userByName["Iris Johansson"].id },
  { projectId: projectByName["Mobile App Launch"].id, userId: userByName["David Kim"].id },
  { projectId: projectByName["Mobile App Launch"].id, userId: userByName["Carol Nguyen"].id },
  // Data Pipeline Upgrade: Karen (DRI), Olivia, Frank
  { projectId: projectByName["Data Pipeline Upgrade"].id, userId: userByName["Karen Liu"].id },
  { projectId: projectByName["Data Pipeline Upgrade"].id, userId: userByName["Olivia Dupont"].id },
  { projectId: projectByName["Data Pipeline Upgrade"].id, userId: userByName["Frank O'Brien"].id },
];

db.insert(projectMembers).values(projectMemberships).run();
console.log(`Seeded ${projectMemberships.length} project memberships.`);

// Seed schedule
const insertedSchedule = db
  .insert(schedules)
  .values({ name: "Q1 2026 Plan", year: 2026, quarter: 1 })
  .returning()
  .get();
console.log(`Seeded schedule: ${insertedSchedule.name}`);

// Seed schedule assignments (Q1 2026 weeks)
const weeks = ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02"];

const scheduleData: { userName: string; projectName: string; weekStart: string }[] = [
  // Alice Chen - Website Redesign most weeks
  { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[0] },
  { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[1] },
  { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[2] },
  { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[3] },
  { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[4] },
  // Bob Martinez - API v2 Migration
  { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[0] },
  { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[1] },
  { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[2] },
  { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[3] },
  { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[4] },
  // Carol Nguyen - splits between Website Redesign and Mobile App
  { userName: "Carol Nguyen", projectName: "Website Redesign", weekStart: weeks[0] },
  { userName: "Carol Nguyen", projectName: "Website Redesign", weekStart: weeks[1] },
  { userName: "Carol Nguyen", projectName: "Mobile App Launch", weekStart: weeks[2] },
  { userName: "Carol Nguyen", projectName: "Mobile App Launch", weekStart: weeks[3] },
  { userName: "Carol Nguyen", projectName: "Mobile App Launch", weekStart: weeks[4] },
  // David Kim - Website Redesign then Mobile App
  { userName: "David Kim", projectName: "Website Redesign", weekStart: weeks[0] },
  { userName: "David Kim", projectName: "Website Redesign", weekStart: weeks[1] },
  { userName: "David Kim", projectName: "Mobile App Launch", weekStart: weeks[3] },
  { userName: "David Kim", projectName: "Mobile App Launch", weekStart: weeks[4] },
  // Elena Popov - API v2 Migration
  { userName: "Elena Popov", projectName: "API v2 Migration", weekStart: weeks[1] },
  { userName: "Elena Popov", projectName: "API v2 Migration", weekStart: weeks[2] },
  { userName: "Elena Popov", projectName: "API v2 Migration", weekStart: weeks[3] },
  // Nathan Fischer - API v2 full time
  { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[0] },
  { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[1] },
  { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[2] },
  { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[3] },
  { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[4] },
  // Grace Tanaka - API v2 then Data Pipeline
  { userName: "Grace Tanaka", projectName: "API v2 Migration", weekStart: weeks[0] },
  { userName: "Grace Tanaka", projectName: "API v2 Migration", weekStart: weeks[1] },
  { userName: "Grace Tanaka", projectName: "Data Pipeline Upgrade", weekStart: weeks[2] },
  { userName: "Grace Tanaka", projectName: "Data Pipeline Upgrade", weekStart: weeks[3] },
  // Hassan Ali - Mobile App Launch
  { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[0] },
  { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[1] },
  { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[2] },
  { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[3] },
  { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[4] },
  // Karen Liu - Data Pipeline full time
  { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[0] },
  { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[1] },
  { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[2] },
  { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[3] },
  { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[4] },
  // Olivia Dupont - Data Pipeline
  { userName: "Olivia Dupont", projectName: "Data Pipeline Upgrade", weekStart: weeks[0] },
  { userName: "Olivia Dupont", projectName: "Data Pipeline Upgrade", weekStart: weeks[1] },
  { userName: "Olivia Dupont", projectName: "Data Pipeline Upgrade", weekStart: weeks[2] },
];

const scheduleValues = scheduleData.map((s) => ({
  scheduleId: insertedSchedule.id,
  userId: userByName[s.userName].id,
  projectId: projectByName[s.projectName].id,
  weekStart: s.weekStart,
}));

db.insert(scheduleAssignments).values(scheduleValues).run();
console.log(`Seeded ${scheduleValues.length} schedule assignments.`);
