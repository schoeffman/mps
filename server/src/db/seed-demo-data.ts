import { db } from "./index.js";
import { users, teams, teamMembers, projects, projectMembers, schedules, scheduleAssignments, workHistory } from "./schema.js";
import { eq } from "drizzle-orm";

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

export async function seedDemoDataForOwner(ownerId: string) {
  try {
    // Idempotency guard — skip if owner already has data
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.ownerId, ownerId)).limit(1);
    if (existing.length > 0) {
      console.log(`Demo data already exists for owner ${ownerId}, skipping.`);
      return;
    }

    console.log(`Seeding demo data for owner: ${ownerId}`);

    // Insert users
    const insertedUsers = await db.insert(users).values(
      seedUsers.map((u) => ({ ...u, ownerId })),
    ).returning();
    console.log(`Seeded ${insertedUsers.length} users.`);

    const userByName = Object.fromEntries(insertedUsers.map((u) => [u.fullName, u]));

    // Seed teams
    const seedTeams = [
      { name: "Frontend Platform", leadName: "Alice Chen" },
      { name: "Backend Services", leadName: "Bob Martinez" },
      { name: "Design Systems", leadName: "Carol Nguyen" },
      { name: "Data & Analytics", leadName: "Karen Liu" },
    ];

    const insertedTeams = await db
      .insert(teams)
      .values(
        seedTeams.map((t) => ({
          name: t.name,
          teamLeadId: userByName[t.leadName].id,
          ownerId,
        })),
      )
      .returning();
    console.log(`Seeded ${insertedTeams.length} teams.`);

    const teamByName = Object.fromEntries(insertedTeams.map((t) => [t.name, t]));

    // Seed team memberships
    const teamMemberships: { teamId: number; userId: number }[] = [
      { teamId: teamByName["Frontend Platform"].id, userId: userByName["Alice Chen"].id },
      { teamId: teamByName["Frontend Platform"].id, userId: userByName["David Kim"].id },
      { teamId: teamByName["Frontend Platform"].id, userId: userByName["Leo Santos"].id },
      { teamId: teamByName["Frontend Platform"].id, userId: userByName["Iris Johansson"].id },
      { teamId: teamByName["Backend Services"].id, userId: userByName["Bob Martinez"].id },
      { teamId: teamByName["Backend Services"].id, userId: userByName["Nathan Fischer"].id },
      { teamId: teamByName["Backend Services"].id, userId: userByName["Grace Tanaka"].id },
      { teamId: teamByName["Backend Services"].id, userId: userByName["Frank O'Brien"].id },
      { teamId: teamByName["Design Systems"].id, userId: userByName["Carol Nguyen"].id },
      { teamId: teamByName["Design Systems"].id, userId: userByName["Hassan Ali"].id },
      { teamId: teamByName["Design Systems"].id, userId: userByName["Maya Patel"].id },
      { teamId: teamByName["Data & Analytics"].id, userId: userByName["Karen Liu"].id },
      { teamId: teamByName["Data & Analytics"].id, userId: userByName["Olivia Dupont"].id },
      { teamId: teamByName["Data & Analytics"].id, userId: userByName["Elena Popov"].id },
    ];

    await db.insert(teamMembers).values(teamMemberships);
    console.log(`Seeded ${teamMemberships.length} team memberships.`);

    // Seed projects
    const seedProjects = [
      { name: "Website Redesign", targetDate: "2026-04-15", driName: "Alice Chen", status: "Make", color: "blue" },
      { name: "API v2 Migration", targetDate: "2026-05-01", driName: "Bob Martinez", status: "Explore", color: "green" },
      { name: "Mobile App Launch", targetDate: "2026-06-30", driName: "Hassan Ali", status: "Explore", color: "purple" },
      { name: "Data Pipeline Upgrade", targetDate: "2026-03-15", driName: "Karen Liu", status: "Complete", color: "amber" },
    ];

    const insertedProjects = await db
      .insert(projects)
      .values(
        seedProjects.map((p) => ({
          name: p.name,
          targetDate: p.targetDate,
          driId: userByName[p.driName].id,
          status: p.status,
          color: p.color,
          ownerId,
        })),
      )
      .returning();
    console.log(`Seeded ${insertedProjects.length} projects.`);

    const projectByName = Object.fromEntries(insertedProjects.map((p) => [p.name, p]));

    // Seed project memberships
    const projectMemberships: { projectId: number; userId: number }[] = [
      { projectId: projectByName["Website Redesign"].id, userId: userByName["Alice Chen"].id },
      { projectId: projectByName["Website Redesign"].id, userId: userByName["Carol Nguyen"].id },
      { projectId: projectByName["Website Redesign"].id, userId: userByName["Leo Santos"].id },
      { projectId: projectByName["Website Redesign"].id, userId: userByName["Maya Patel"].id },
      { projectId: projectByName["API v2 Migration"].id, userId: userByName["Bob Martinez"].id },
      { projectId: projectByName["API v2 Migration"].id, userId: userByName["Nathan Fischer"].id },
      { projectId: projectByName["API v2 Migration"].id, userId: userByName["Grace Tanaka"].id },
      { projectId: projectByName["API v2 Migration"].id, userId: userByName["Elena Popov"].id },
      { projectId: projectByName["Mobile App Launch"].id, userId: userByName["Hassan Ali"].id },
      { projectId: projectByName["Mobile App Launch"].id, userId: userByName["Iris Johansson"].id },
      { projectId: projectByName["Mobile App Launch"].id, userId: userByName["David Kim"].id },
      { projectId: projectByName["Mobile App Launch"].id, userId: userByName["Carol Nguyen"].id },
      { projectId: projectByName["Data Pipeline Upgrade"].id, userId: userByName["Karen Liu"].id },
      { projectId: projectByName["Data Pipeline Upgrade"].id, userId: userByName["Olivia Dupont"].id },
      { projectId: projectByName["Data Pipeline Upgrade"].id, userId: userByName["Frank O'Brien"].id },
    ];

    await db.insert(projectMembers).values(projectMemberships);
    console.log(`Seeded ${projectMemberships.length} project memberships.`);

    // Seed schedule
    const [insertedSchedule] = await db
      .insert(schedules)
      .values({ name: "Q1 2026 Plan", year: 2026, quarter: 1, ownerId })
      .returning();
    console.log(`Seeded schedule: ${insertedSchedule.name}`);

    // Seed schedule assignments
    const weeks = ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02"];

    const scheduleData: { userName: string; projectName: string; weekStart: string }[] = [
      { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[0] },
      { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[1] },
      { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[2] },
      { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[3] },
      { userName: "Alice Chen", projectName: "Website Redesign", weekStart: weeks[4] },
      { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[0] },
      { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[1] },
      { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[2] },
      { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[3] },
      { userName: "Bob Martinez", projectName: "API v2 Migration", weekStart: weeks[4] },
      { userName: "Carol Nguyen", projectName: "Website Redesign", weekStart: weeks[0] },
      { userName: "Carol Nguyen", projectName: "Website Redesign", weekStart: weeks[1] },
      { userName: "Carol Nguyen", projectName: "Mobile App Launch", weekStart: weeks[2] },
      { userName: "Carol Nguyen", projectName: "Mobile App Launch", weekStart: weeks[3] },
      { userName: "Carol Nguyen", projectName: "Mobile App Launch", weekStart: weeks[4] },
      { userName: "David Kim", projectName: "Website Redesign", weekStart: weeks[0] },
      { userName: "David Kim", projectName: "Website Redesign", weekStart: weeks[1] },
      { userName: "David Kim", projectName: "Mobile App Launch", weekStart: weeks[3] },
      { userName: "David Kim", projectName: "Mobile App Launch", weekStart: weeks[4] },
      { userName: "Elena Popov", projectName: "API v2 Migration", weekStart: weeks[1] },
      { userName: "Elena Popov", projectName: "API v2 Migration", weekStart: weeks[2] },
      { userName: "Elena Popov", projectName: "API v2 Migration", weekStart: weeks[3] },
      { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[0] },
      { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[1] },
      { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[2] },
      { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[3] },
      { userName: "Nathan Fischer", projectName: "API v2 Migration", weekStart: weeks[4] },
      { userName: "Grace Tanaka", projectName: "API v2 Migration", weekStart: weeks[0] },
      { userName: "Grace Tanaka", projectName: "API v2 Migration", weekStart: weeks[1] },
      { userName: "Grace Tanaka", projectName: "Data Pipeline Upgrade", weekStart: weeks[2] },
      { userName: "Grace Tanaka", projectName: "Data Pipeline Upgrade", weekStart: weeks[3] },
      { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[0] },
      { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[1] },
      { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[2] },
      { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[3] },
      { userName: "Hassan Ali", projectName: "Mobile App Launch", weekStart: weeks[4] },
      { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[0] },
      { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[1] },
      { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[2] },
      { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[3] },
      { userName: "Karen Liu", projectName: "Data Pipeline Upgrade", weekStart: weeks[4] },
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

    await db.insert(scheduleAssignments).values(scheduleValues);
    console.log(`Seeded ${scheduleValues.length} schedule assignments.`);

    // Seed work history — snapshot current-week assignments for recent days
    const currentWeekAssignments = scheduleData.filter((s) => s.weekStart === "2026-02-02");
    const historyDays = ["2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06", "2026-02-07"];
    const workHistoryValues = historyDays.flatMap((date) =>
      currentWeekAssignments.map((s) => ({
        userId: userByName[s.userName].id,
        projectId: projectByName[s.projectName].id,
        scheduleId: insertedSchedule.id,
        date,
        ownerId,
      })),
    );

    await db.insert(workHistory).values(workHistoryValues);
    console.log(`Seeded ${workHistoryValues.length} work history entries.`);

    console.log(`Demo data seeding complete for owner ${ownerId}.`);
  } catch (err) {
    console.error("Failed to seed demo data:", err);
  }
}
