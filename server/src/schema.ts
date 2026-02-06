import gql from "graphql-tag";
import { eq, inArray, gte, lte, and } from "drizzle-orm";
import { db } from "./db/index.js";
import { users, teams, teamMembers, projects, projectMembers, schedules, scheduleAssignments } from "./db/schema.js";

export const typeDefs = gql`
  enum CraftAbility {
    Engineering
    Design
    ProductManagement
    DataScience
  }

  enum JobLevel {
    Junior
    Mid
    Senior
    Staff
    Principal
  }

  enum CraftFocus {
    Frontend
    Backend
    Fullstack
    Mobile
    Infrastructure
    NotApplicable
  }

  type User {
    id: Int!
    fullName: String!
    craftAbility: CraftAbility!
    jobLevel: JobLevel!
    craftFocus: CraftFocus!
    createdAt: String!
  }

  input CreateUserInput {
    fullName: String!
    craftAbility: CraftAbility!
    jobLevel: JobLevel!
    craftFocus: CraftFocus!
  }

  input UpdateUserInput {
    fullName: String!
    craftAbility: CraftAbility!
    jobLevel: JobLevel!
    craftFocus: CraftFocus!
  }

  type Team {
    id: Int!
    name: String!
    teamLead: User!
    members: [User!]!
    createdAt: String!
  }

  input CreateTeamInput {
    name: String!
    teamLeadId: Int!
    memberIds: [Int!]!
  }

  input UpdateTeamInput {
    name: String!
    teamLeadId: Int!
    memberIds: [Int!]!
  }

  enum ProjectStatus {
    Explore
    Make
    Complete
  }

  type Project {
    id: Int!
    name: String!
    targetDate: String!
    dri: User!
    status: ProjectStatus!
    members: [User!]!
    createdAt: String!
  }

  input CreateProjectInput {
    name: String!
    targetDate: String!
    driId: Int!
    status: ProjectStatus!
    memberIds: [Int!]!
  }

  input UpdateProjectInput {
    name: String!
    targetDate: String!
    driId: Int!
    status: ProjectStatus!
    memberIds: [Int!]!
  }

  type Schedule {
    id: Int!
    name: String!
    year: Int!
    quarter: Int!
    createdAt: String!
  }

  input CreateScheduleInput {
    name: String!
    year: Int!
    quarter: Int!
  }

  input UpdateScheduleInput {
    name: String!
    year: Int!
    quarter: Int!
  }

  type ScheduleAssignment {
    id: Int!
    scheduleId: Int!
    userId: Int!
    projectId: Int!
    weekStart: String!
  }

  type Query {
    hello: String
    users: [User!]!
    user(id: Int!): User
    teams: [Team!]!
    team(id: Int!): Team
    projects: [Project!]!
    project(id: Int!): Project
    schedules: [Schedule!]!
    schedule(id: Int!): Schedule
    scheduleAssignments(scheduleId: Int!, startDate: String!, endDate: String!): [ScheduleAssignment!]!
  }

  input BulkAssignmentInput {
    userId: Int!
    weekStart: String!
    projectId: Int
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: Int!, input: UpdateUserInput!): User!
    deleteUser(id: Int!): Boolean!
    createTeam(input: CreateTeamInput!): Team!
    updateTeam(id: Int!, input: UpdateTeamInput!): Team!
    deleteTeam(id: Int!): Boolean!
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: Int!, input: UpdateProjectInput!): Project!
    deleteProject(id: Int!): Boolean!
    createSchedule(input: CreateScheduleInput!): Schedule!
    updateSchedule(id: Int!, input: UpdateScheduleInput!): Schedule!
    deleteSchedule(id: Int!): Boolean!
    setScheduleAssignment(scheduleId: Int!, userId: Int!, weekStart: String!, projectId: Int): ScheduleAssignment
    bulkSetScheduleAssignments(scheduleId: Int!, assignments: [BulkAssignmentInput!]!): Boolean!
  }
`;

const craftAbilityToDb: Record<string, string> = {
  Engineering: "Engineering",
  Design: "Design",
  ProductManagement: "Product Management",
  DataScience: "Data Science",
};

const craftAbilityFromDb: Record<string, string> = {
  Engineering: "Engineering",
  Design: "Design",
  "Product Management": "ProductManagement",
  "Data Science": "DataScience",
};

const craftFocusToDb: Record<string, string> = {
  Frontend: "Frontend",
  Backend: "Backend",
  Fullstack: "Fullstack",
  Mobile: "Mobile",
  Infrastructure: "Infrastructure",
  NotApplicable: "Not Applicable",
};

const craftFocusFromDb: Record<string, string> = {
  Frontend: "Frontend",
  Backend: "Backend",
  Fullstack: "Fullstack",
  Mobile: "Mobile",
  Infrastructure: "Infrastructure",
  "Not Applicable": "NotApplicable",
};

function mapUserFromDb(row: typeof users.$inferSelect) {
  return {
    ...row,
    craftAbility: craftAbilityFromDb[row.craftAbility] ?? row.craftAbility,
    craftFocus: craftFocusFromDb[row.craftFocus] ?? row.craftFocus,
  };
}

function mapTeamFromDb(teamRow: typeof teams.$inferSelect) {
  const leadRow = db.select().from(users).where(eq(users.id, teamRow.teamLeadId)).get();
  const memberRows = db
    .select({ user: users })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamRow.id))
    .all();

  return {
    id: teamRow.id,
    name: teamRow.name,
    teamLead: leadRow ? mapUserFromDb(leadRow) : null,
    members: memberRows.map((r) => mapUserFromDb(r.user)),
    createdAt: teamRow.createdAt,
  };
}

function mapScheduleFromDb(row: typeof schedules.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    year: row.year,
    quarter: row.quarter,
    createdAt: row.createdAt,
  };
}

function mapScheduleAssignmentFromDb(row: typeof scheduleAssignments.$inferSelect) {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    userId: row.userId,
    projectId: row.projectId,
    weekStart: row.weekStart,
  };
}

function mapProjectFromDb(projectRow: typeof projects.$inferSelect) {
  const driRow = db.select().from(users).where(eq(users.id, projectRow.driId)).get();
  const memberRows = db
    .select({ user: users })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectRow.id))
    .all();

  return {
    id: projectRow.id,
    name: projectRow.name,
    targetDate: projectRow.targetDate,
    dri: driRow ? mapUserFromDb(driRow) : null,
    status: projectRow.status,
    members: memberRows.map((r) => mapUserFromDb(r.user)),
    createdAt: projectRow.createdAt,
  };
}

export const resolvers = {
  Query: {
    hello: () => "Hello world from Apollo Server!",
    users: () => {
      const rows = db.select().from(users).all();
      return rows.map(mapUserFromDb);
    },
    user: (_: unknown, { id }: { id: number }) => {
      const row = db.select().from(users).where(eq(users.id, id)).get();
      if (!row) return null;
      return mapUserFromDb(row);
    },
    teams: () => {
      const rows = db.select().from(teams).all();
      return rows.map(mapTeamFromDb);
    },
    team: (_: unknown, { id }: { id: number }) => {
      const row = db.select().from(teams).where(eq(teams.id, id)).get();
      if (!row) return null;
      return mapTeamFromDb(row);
    },
    projects: () => {
      const rows = db.select().from(projects).all();
      return rows.map(mapProjectFromDb);
    },
    project: (_: unknown, { id }: { id: number }) => {
      const row = db.select().from(projects).where(eq(projects.id, id)).get();
      if (!row) return null;
      return mapProjectFromDb(row);
    },
    schedules: () => {
      const rows = db.select().from(schedules).all();
      return rows.map(mapScheduleFromDb);
    },
    schedule: (_: unknown, { id }: { id: number }) => {
      const row = db.select().from(schedules).where(eq(schedules.id, id)).get();
      if (!row) return null;
      return mapScheduleFromDb(row);
    },
    scheduleAssignments: (_: unknown, { scheduleId, startDate, endDate }: { scheduleId: number; startDate: string; endDate: string }) => {
      const rows = db
        .select()
        .from(scheduleAssignments)
        .where(and(
          eq(scheduleAssignments.scheduleId, scheduleId),
          gte(scheduleAssignments.weekStart, startDate),
          lte(scheduleAssignments.weekStart, endDate),
        ))
        .all();
      return rows.map(mapScheduleAssignmentFromDb);
    },
  },
  Mutation: {
    createUser: (
      _: unknown,
      { input }: { input: { fullName: string; craftAbility: string; jobLevel: string; craftFocus: string } },
    ) => {
      const row = db
        .insert(users)
        .values({
          fullName: input.fullName,
          craftAbility: craftAbilityToDb[input.craftAbility] ?? input.craftAbility,
          jobLevel: input.jobLevel,
          craftFocus: craftFocusToDb[input.craftFocus] ?? input.craftFocus,
        })
        .returning()
        .get();
      return mapUserFromDb(row);
    },
    updateUser: (
      _: unknown,
      { id, input }: { id: number; input: { fullName: string; craftAbility: string; jobLevel: string; craftFocus: string } },
    ) => {
      const row = db
        .update(users)
        .set({
          fullName: input.fullName,
          craftAbility: craftAbilityToDb[input.craftAbility] ?? input.craftAbility,
          jobLevel: input.jobLevel,
          craftFocus: craftFocusToDb[input.craftFocus] ?? input.craftFocus,
        })
        .where(eq(users.id, id))
        .returning()
        .get();
      return mapUserFromDb(row);
    },
    deleteUser: (_: unknown, { id }: { id: number }) => {
      // Check if user is a team lead
      const teamLead = db.select().from(teams).where(eq(teams.teamLeadId, id)).get();
      if (teamLead) {
        throw new Error(`Cannot delete user: they are the lead of team "${teamLead.name}"`);
      }

      // Check if user is a project DRI
      const projectDri = db.select().from(projects).where(eq(projects.driId, id)).get();
      if (projectDri) {
        throw new Error(`Cannot delete user: they are the DRI of project "${projectDri.name}"`);
      }

      // Remove from team memberships
      db.delete(teamMembers).where(eq(teamMembers.userId, id)).run();

      // Remove from project memberships
      db.delete(projectMembers).where(eq(projectMembers.userId, id)).run();

      // Delete the user
      const result = db.delete(users).where(eq(users.id, id)).run();
      return result.changes > 0;
    },
    createTeam: (
      _: unknown,
      { input }: { input: { name: string; teamLeadId: number; memberIds: number[] } },
    ) => {
      // Ensure lead is included in members
      const allMemberIds = input.memberIds.includes(input.teamLeadId)
        ? input.memberIds
        : [...input.memberIds, input.teamLeadId];

      const teamRow = db
        .insert(teams)
        .values({ name: input.name, teamLeadId: input.teamLeadId })
        .returning()
        .get();

      db.insert(teamMembers)
        .values(allMemberIds.map((userId) => ({ teamId: teamRow.id, userId })))
        .run();

      return mapTeamFromDb(teamRow);
    },
    updateTeam: (
      _: unknown,
      { id, input }: { id: number; input: { name: string; teamLeadId: number; memberIds: number[] } },
    ) => {
      const allMemberIds = input.memberIds.includes(input.teamLeadId)
        ? input.memberIds
        : [...input.memberIds, input.teamLeadId];

      const teamRow = db
        .update(teams)
        .set({ name: input.name, teamLeadId: input.teamLeadId })
        .where(eq(teams.id, id))
        .returning()
        .get();

      // Replace all memberships
      db.delete(teamMembers).where(eq(teamMembers.teamId, id)).run();
      db.insert(teamMembers)
        .values(allMemberIds.map((userId) => ({ teamId: id, userId })))
        .run();

      return mapTeamFromDb(teamRow);
    },
    deleteTeam: (_: unknown, { id }: { id: number }) => {
      const result = db.delete(teams).where(eq(teams.id, id)).run();
      return result.changes > 0;
    },
    createProject: (
      _: unknown,
      { input }: { input: { name: string; targetDate: string; driId: number; status: string; memberIds: number[] } },
    ) => {
      // Ensure DRI is included in members
      const allMemberIds = input.memberIds.includes(input.driId)
        ? input.memberIds
        : [...input.memberIds, input.driId];

      const projectRow = db
        .insert(projects)
        .values({
          name: input.name,
          targetDate: input.targetDate,
          driId: input.driId,
          status: input.status,
        })
        .returning()
        .get();

      db.insert(projectMembers)
        .values(allMemberIds.map((userId) => ({ projectId: projectRow.id, userId })))
        .run();

      return mapProjectFromDb(projectRow);
    },
    updateProject: (
      _: unknown,
      { id, input }: { id: number; input: { name: string; targetDate: string; driId: number; status: string; memberIds: number[] } },
    ) => {
      const allMemberIds = input.memberIds.includes(input.driId)
        ? input.memberIds
        : [...input.memberIds, input.driId];

      const projectRow = db
        .update(projects)
        .set({
          name: input.name,
          targetDate: input.targetDate,
          driId: input.driId,
          status: input.status,
        })
        .where(eq(projects.id, id))
        .returning()
        .get();

      // Replace all memberships
      db.delete(projectMembers).where(eq(projectMembers.projectId, id)).run();
      db.insert(projectMembers)
        .values(allMemberIds.map((userId) => ({ projectId: id, userId })))
        .run();

      return mapProjectFromDb(projectRow);
    },
    deleteProject: (_: unknown, { id }: { id: number }) => {
      const result = db.delete(projects).where(eq(projects.id, id)).run();
      return result.changes > 0;
    },
    createSchedule: (
      _: unknown,
      { input }: { input: { name: string; year: number; quarter: number } },
    ) => {
      const row = db
        .insert(schedules)
        .values({ name: input.name, year: input.year, quarter: input.quarter })
        .returning()
        .get();
      return mapScheduleFromDb(row);
    },
    updateSchedule: (
      _: unknown,
      { id, input }: { id: number; input: { name: string; year: number; quarter: number } },
    ) => {
      const row = db
        .update(schedules)
        .set({ name: input.name, year: input.year, quarter: input.quarter })
        .where(eq(schedules.id, id))
        .returning()
        .get();
      return mapScheduleFromDb(row);
    },
    deleteSchedule: (_: unknown, { id }: { id: number }) => {
      const result = db.delete(schedules).where(eq(schedules.id, id)).run();
      return result.changes > 0;
    },
    setScheduleAssignment: (
      _: unknown,
      { scheduleId, userId, weekStart, projectId }: { scheduleId: number; userId: number; weekStart: string; projectId: number | null },
    ) => {
      if (projectId == null) {
        db.delete(scheduleAssignments)
          .where(and(
            eq(scheduleAssignments.scheduleId, scheduleId),
            eq(scheduleAssignments.userId, userId),
            eq(scheduleAssignments.weekStart, weekStart),
          ))
          .run();
        return null;
      }

      // Upsert: try to find existing
      const existing = db
        .select()
        .from(scheduleAssignments)
        .where(and(
          eq(scheduleAssignments.scheduleId, scheduleId),
          eq(scheduleAssignments.userId, userId),
          eq(scheduleAssignments.weekStart, weekStart),
        ))
        .get();

      if (existing) {
        const row = db
          .update(scheduleAssignments)
          .set({ projectId })
          .where(eq(scheduleAssignments.id, existing.id))
          .returning()
          .get();
        return mapScheduleAssignmentFromDb(row);
      }

      const row = db
        .insert(scheduleAssignments)
        .values({ scheduleId, userId, projectId, weekStart })
        .returning()
        .get();
      return mapScheduleAssignmentFromDb(row);
    },
    bulkSetScheduleAssignments: (
      _: unknown,
      { scheduleId, assignments }: { scheduleId: number; assignments: { userId: number; weekStart: string; projectId: number | null }[] },
    ) => {
      for (const { userId, weekStart, projectId } of assignments) {
        if (projectId == null) {
          db.delete(scheduleAssignments)
            .where(and(
              eq(scheduleAssignments.scheduleId, scheduleId),
              eq(scheduleAssignments.userId, userId),
              eq(scheduleAssignments.weekStart, weekStart),
            ))
            .run();
        } else {
          const existing = db
            .select()
            .from(scheduleAssignments)
            .where(and(
              eq(scheduleAssignments.scheduleId, scheduleId),
              eq(scheduleAssignments.userId, userId),
              eq(scheduleAssignments.weekStart, weekStart),
            ))
            .get();

          if (existing) {
            db.update(scheduleAssignments)
              .set({ projectId })
              .where(eq(scheduleAssignments.id, existing.id))
              .run();
          } else {
            db.insert(scheduleAssignments)
              .values({ scheduleId, userId, projectId, weekStart })
              .run();
          }
        }
      }
      return true;
    },
  },
};
