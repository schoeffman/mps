import gql from "graphql-tag";
import { eq, inArray, gte, lte, and } from "drizzle-orm";
import { db } from "./db/index.js";
import { users, teams, teamMembers, projects, projectMembers, schedules, scheduleAssignments } from "./db/schema.js";

export interface Context {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image?: string | null | undefined;
      createdAt: Date;
      updatedAt: Date;
    };
    session: {
      id: string;
      token: string;
      expiresAt: Date;
      userId: string;
      ipAddress?: string | null | undefined;
      userAgent?: string | null | undefined;
    };
  } | null;
}

function requireAuth(context: Context) {
  if (!context.session) {
    throw new Error("Not authenticated");
  }
  return context.session;
}

function getOwnerId(context: Context): string {
  const session = requireAuth(context);
  return session.user.id;
}

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
    color: String!
    members: [User!]!
    createdAt: String!
  }

  input CreateProjectInput {
    name: String!
    targetDate: String!
    driId: Int!
    status: ProjectStatus!
    color: String!
    memberIds: [Int!]!
  }

  input UpdateProjectInput {
    name: String!
    targetDate: String!
    driId: Int!
    status: ProjectStatus!
    color: String!
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

  type AuthUser {
    id: String!
    name: String!
    email: String!
    image: String
  }

  type SessionInfo {
    user: AuthUser!
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
    me: SessionInfo
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
    linkAuthUser(appUserId: Int!): Boolean!
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
    createdAt: row.createdAt.toISOString(),
    craftAbility: craftAbilityFromDb[row.craftAbility] ?? row.craftAbility,
    craftFocus: craftFocusFromDb[row.craftFocus] ?? row.craftFocus,
  };
}

async function mapTeamFromDb(teamRow: typeof teams.$inferSelect) {
  const [leadRow] = await db.select().from(users).where(eq(users.id, teamRow.teamLeadId));
  const memberRows = await db
    .select({ user: users })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamRow.id));

  return {
    id: teamRow.id,
    name: teamRow.name,
    teamLead: leadRow ? mapUserFromDb(leadRow) : null,
    members: memberRows.map((r) => mapUserFromDb(r.user)),
    createdAt: teamRow.createdAt.toISOString(),
  };
}

function mapScheduleFromDb(row: typeof schedules.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    year: row.year,
    quarter: row.quarter,
    createdAt: row.createdAt.toISOString(),
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

async function mapProjectFromDb(projectRow: typeof projects.$inferSelect) {
  const [driRow] = await db.select().from(users).where(eq(users.id, projectRow.driId));
  const memberRows = await db
    .select({ user: users })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectRow.id));

  return {
    id: projectRow.id,
    name: projectRow.name,
    targetDate: projectRow.targetDate,
    dri: driRow ? mapUserFromDb(driRow) : null,
    status: projectRow.status,
    color: projectRow.color,
    members: memberRows.map((r) => mapUserFromDb(r.user)),
    createdAt: projectRow.createdAt.toISOString(),
  };
}

export const resolvers = {
  Query: {
    hello: () => "Hello world from Apollo Server!",
    users: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db.select().from(users).where(eq(users.ownerId, ownerId));
      return rows.map(mapUserFromDb);
    },
    user: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db.select().from(users).where(and(eq(users.id, id), eq(users.ownerId, ownerId)));
      if (!row) return null;
      return mapUserFromDb(row);
    },
    teams: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db.select().from(teams).where(eq(teams.ownerId, ownerId));
      return Promise.all(rows.map(mapTeamFromDb));
    },
    team: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.ownerId, ownerId)));
      if (!row) return null;
      return mapTeamFromDb(row);
    },
    projects: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db.select().from(projects).where(eq(projects.ownerId, ownerId));
      return Promise.all(rows.map(mapProjectFromDb));
    },
    project: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
      if (!row) return null;
      return mapProjectFromDb(row);
    },
    schedules: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db.select().from(schedules).where(eq(schedules.ownerId, ownerId));
      return rows.map(mapScheduleFromDb);
    },
    schedule: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db.select().from(schedules).where(and(eq(schedules.id, id), eq(schedules.ownerId, ownerId)));
      if (!row) return null;
      return mapScheduleFromDb(row);
    },
    scheduleAssignments: async (_: unknown, { scheduleId, startDate, endDate }: { scheduleId: number; startDate: string; endDate: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      // Verify schedule ownership
      const [schedule] = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.ownerId, ownerId)));
      if (!schedule) throw new Error("Schedule not found");

      const rows = await db
        .select()
        .from(scheduleAssignments)
        .where(and(
          eq(scheduleAssignments.scheduleId, scheduleId),
          gte(scheduleAssignments.weekStart, startDate),
          lte(scheduleAssignments.weekStart, endDate),
        ));
      return rows.map(mapScheduleAssignmentFromDb);
    },
    me: (_: unknown, __: unknown, context: Context) => {
      if (!context.session) return null;
      return {
        user: {
          id: context.session.user.id,
          name: context.session.user.name,
          email: context.session.user.email,
          image: context.session.user.image,
        },
      };
    },
  },
  Mutation: {
    createUser: async (
      _: unknown,
      { input }: { input: { fullName: string; craftAbility: string; jobLevel: string; craftFocus: string } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .insert(users)
        .values({
          fullName: input.fullName,
          craftAbility: craftAbilityToDb[input.craftAbility] ?? input.craftAbility,
          jobLevel: input.jobLevel,
          craftFocus: craftFocusToDb[input.craftFocus] ?? input.craftFocus,
          ownerId,
        })
        .returning();
      return mapUserFromDb(row);
    },
    updateUser: async (
      _: unknown,
      { id, input }: { id: number; input: { fullName: string; craftAbility: string; jobLevel: string; craftFocus: string } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .update(users)
        .set({
          fullName: input.fullName,
          craftAbility: craftAbilityToDb[input.craftAbility] ?? input.craftAbility,
          jobLevel: input.jobLevel,
          craftFocus: craftFocusToDb[input.craftFocus] ?? input.craftFocus,
        })
        .where(and(eq(users.id, id), eq(users.ownerId, ownerId)))
        .returning();
      if (!row) throw new Error("User not found");
      return mapUserFromDb(row);
    },
    deleteUser: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      // Check if user is a team lead (only within owner's teams)
      const [teamLead] = await db.select().from(teams).where(and(eq(teams.teamLeadId, id), eq(teams.ownerId, ownerId)));
      if (teamLead) {
        throw new Error(`Cannot delete user: they are the lead of team "${teamLead.name}"`);
      }

      // Check if user is a project DRI (only within owner's projects)
      const [projectDri] = await db.select().from(projects).where(and(eq(projects.driId, id), eq(projects.ownerId, ownerId)));
      if (projectDri) {
        throw new Error(`Cannot delete user: they are the DRI of project "${projectDri.name}"`);
      }

      // Remove from team memberships
      await db.delete(teamMembers).where(eq(teamMembers.userId, id));

      // Remove from project memberships
      await db.delete(projectMembers).where(eq(projectMembers.userId, id));

      // Delete the user (scoped by owner)
      const deleted = await db.delete(users).where(and(eq(users.id, id), eq(users.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    createTeam: async (
      _: unknown,
      { input }: { input: { name: string; teamLeadId: number; memberIds: number[] } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      // Ensure lead is included in members
      const allMemberIds = input.memberIds.includes(input.teamLeadId)
        ? input.memberIds
        : [...input.memberIds, input.teamLeadId];

      const [teamRow] = await db
        .insert(teams)
        .values({ name: input.name, teamLeadId: input.teamLeadId, ownerId })
        .returning();

      await db.insert(teamMembers)
        .values(allMemberIds.map((userId) => ({ teamId: teamRow.id, userId })));

      return mapTeamFromDb(teamRow);
    },
    updateTeam: async (
      _: unknown,
      { id, input }: { id: number; input: { name: string; teamLeadId: number; memberIds: number[] } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const allMemberIds = input.memberIds.includes(input.teamLeadId)
        ? input.memberIds
        : [...input.memberIds, input.teamLeadId];

      const [teamRow] = await db
        .update(teams)
        .set({ name: input.name, teamLeadId: input.teamLeadId })
        .where(and(eq(teams.id, id), eq(teams.ownerId, ownerId)))
        .returning();
      if (!teamRow) throw new Error("Team not found");

      // Replace all memberships
      await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
      await db.insert(teamMembers)
        .values(allMemberIds.map((userId) => ({ teamId: id, userId })));

      return mapTeamFromDb(teamRow);
    },
    deleteTeam: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const deleted = await db.delete(teams).where(and(eq(teams.id, id), eq(teams.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    createProject: async (
      _: unknown,
      { input }: { input: { name: string; targetDate: string; driId: number; status: string; color: string; memberIds: number[] } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      // Ensure DRI is included in members
      const allMemberIds = input.memberIds.includes(input.driId)
        ? input.memberIds
        : [...input.memberIds, input.driId];

      const [projectRow] = await db
        .insert(projects)
        .values({
          name: input.name,
          targetDate: input.targetDate,
          driId: input.driId,
          status: input.status,
          color: input.color,
          ownerId,
        })
        .returning();

      await db.insert(projectMembers)
        .values(allMemberIds.map((userId) => ({ projectId: projectRow.id, userId })));

      return mapProjectFromDb(projectRow);
    },
    updateProject: async (
      _: unknown,
      { id, input }: { id: number; input: { name: string; targetDate: string; driId: number; status: string; color: string; memberIds: number[] } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const allMemberIds = input.memberIds.includes(input.driId)
        ? input.memberIds
        : [...input.memberIds, input.driId];

      const [projectRow] = await db
        .update(projects)
        .set({
          name: input.name,
          targetDate: input.targetDate,
          driId: input.driId,
          status: input.status,
          color: input.color,
        })
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
        .returning();
      if (!projectRow) throw new Error("Project not found");

      // Replace all memberships
      await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
      await db.insert(projectMembers)
        .values(allMemberIds.map((userId) => ({ projectId: id, userId })));

      return mapProjectFromDb(projectRow);
    },
    deleteProject: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const deleted = await db.delete(projects).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    createSchedule: async (
      _: unknown,
      { input }: { input: { name: string; year: number; quarter: number } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .insert(schedules)
        .values({ name: input.name, year: input.year, quarter: input.quarter, ownerId })
        .returning();
      return mapScheduleFromDb(row);
    },
    updateSchedule: async (
      _: unknown,
      { id, input }: { id: number; input: { name: string; year: number; quarter: number } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .update(schedules)
        .set({ name: input.name, year: input.year, quarter: input.quarter })
        .where(and(eq(schedules.id, id), eq(schedules.ownerId, ownerId)))
        .returning();
      if (!row) throw new Error("Schedule not found");
      return mapScheduleFromDb(row);
    },
    deleteSchedule: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const deleted = await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    setScheduleAssignment: async (
      _: unknown,
      { scheduleId, userId, weekStart, projectId }: { scheduleId: number; userId: number; weekStart: string; projectId: number | null },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      // Verify schedule ownership
      const [schedule] = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.ownerId, ownerId)));
      if (!schedule) throw new Error("Schedule not found");

      if (projectId == null) {
        await db.delete(scheduleAssignments)
          .where(and(
            eq(scheduleAssignments.scheduleId, scheduleId),
            eq(scheduleAssignments.userId, userId),
            eq(scheduleAssignments.weekStart, weekStart),
          ));
        return null;
      }

      // Upsert: try to find existing
      const [existing] = await db
        .select()
        .from(scheduleAssignments)
        .where(and(
          eq(scheduleAssignments.scheduleId, scheduleId),
          eq(scheduleAssignments.userId, userId),
          eq(scheduleAssignments.weekStart, weekStart),
        ));

      if (existing) {
        const [row] = await db
          .update(scheduleAssignments)
          .set({ projectId })
          .where(eq(scheduleAssignments.id, existing.id))
          .returning();
        return mapScheduleAssignmentFromDb(row);
      }

      const [row] = await db
        .insert(scheduleAssignments)
        .values({ scheduleId, userId, projectId, weekStart })
        .returning();
      return mapScheduleAssignmentFromDb(row);
    },
    bulkSetScheduleAssignments: async (
      _: unknown,
      { scheduleId, assignments }: { scheduleId: number; assignments: { userId: number; weekStart: string; projectId: number | null }[] },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      // Verify schedule ownership
      const [schedule] = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.ownerId, ownerId)));
      if (!schedule) throw new Error("Schedule not found");

      for (const { userId, weekStart, projectId } of assignments) {
        if (projectId == null) {
          await db.delete(scheduleAssignments)
            .where(and(
              eq(scheduleAssignments.scheduleId, scheduleId),
              eq(scheduleAssignments.userId, userId),
              eq(scheduleAssignments.weekStart, weekStart),
            ));
        } else {
          const [existing] = await db
            .select()
            .from(scheduleAssignments)
            .where(and(
              eq(scheduleAssignments.scheduleId, scheduleId),
              eq(scheduleAssignments.userId, userId),
              eq(scheduleAssignments.weekStart, weekStart),
            ));

          if (existing) {
            await db.update(scheduleAssignments)
              .set({ projectId })
              .where(eq(scheduleAssignments.id, existing.id));
          } else {
            await db.insert(scheduleAssignments)
              .values({ scheduleId, userId, projectId, weekStart });
          }
        }
      }
      return true;
    },
    linkAuthUser: async (
      _: unknown,
      { appUserId }: { appUserId: number },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const updated = await db
        .update(users)
        .set({ authUserId: ownerId })
        .where(and(eq(users.id, appUserId), eq(users.ownerId, ownerId)))
        .returning();
      return updated.length > 0;
    },
  },
};
