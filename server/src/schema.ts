import gql from "graphql-tag";
import { eq, inArray, gte, lte, gt, lt, and, or, desc, asc } from "drizzle-orm";
import { db } from "./db/index.js";
import { users, teams, teamMembers, projects, projectMembers, projectLinks, schedules, scheduleAssignments, workHistory, session, account, verification, authUser, spaceMembers, jiraConfig, jobLevelLimits, projectChecklistCompletions, performanceCycles, performanceCycleMembers } from "./db/schema.js";
import { mergeWeekRanges } from "./lib/merge-week-ranges.js";
import { generateDateRange } from "./lib/generate-date-range.js";
import { fetchJiraIssues, fetchJiraTransitions, transitionJiraIssue, searchJiraUsers, assignJiraIssue } from "./lib/jira-client.js";
import { fetchAtlassianProject } from "./lib/atlassian-projects-client.js";

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
  spaceOwnerId: string | null;
}

function requireAuth(context: Context) {
  if (!context.session) {
    throw new Error("Not authenticated");
  }
  return context.session;
}

function getOwnerId(context: Context): string {
  requireAuth(context);
  return context.spaceOwnerId!;
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
    levelStartDate: String
    craftFocus: CraftFocus!
    rating: String
    createdAt: String!
  }

  input CreateUserInput {
    fullName: String!
    craftAbility: CraftAbility!
    jobLevel: JobLevel!
    levelStartDate: String
    craftFocus: CraftFocus!
  }

  input UpdateUserInput {
    fullName: String!
    craftAbility: CraftAbility!
    jobLevel: JobLevel!
    levelStartDate: String
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
    Cancelled
    Paused
  }

  enum ProjectType {
    FeatureDevelopment
    Maintenance
    Other
  }

  type ProjectLink {
    id: Int!
    url: String!
    createdAt: String!
  }

  type Project {
    id: Int!
    name: String!
    targetDate: String!
    dri: User
    status: ProjectStatus!
    color: String!
    projectType: ProjectType!
    isSystem: Boolean!
    jiraProjectKey: String
    atlassianProjectKey: String
    members: [User!]!
    links: [ProjectLink!]!
    createdAt: String!
  }

  type JobLevelLimit {
    jobLevel: JobLevel!
    limitMonths: Int!
  }

  type JiraConfig {
    id: Int!
    domain: String!
    email: String!
    hasToken: Boolean!
    storyPointsFieldId: String
  }

  type JiraIssue {
    key: String!
    summary: String!
    description: String
    status: String!
    statusColor: String!
    assignee: String
    storyPoints: Float
  }

  type JiraTransition {
    id: String!
    name: String!
  }

  type JiraUser {
    accountId: String!
    displayName: String!
    emailAddress: String
  }

  type AtlassianProjectUpdate {
    status: String
    summary: String
    date: String
  }

  type AtlassianProjectData {
    name: String!
    status: String
    dueDate: String
    latestUpdate: AtlassianProjectUpdate
  }

  input CreateProjectInput {
    name: String!
    targetDate: String!
    driId: Int!
    status: ProjectStatus!
    color: String!
    projectType: ProjectType
    jiraProjectKey: String
    atlassianProjectKey: String
  }

  input UpdateProjectInput {
    name: String!
    targetDate: String!
    driId: Int
    status: ProjectStatus!
    color: String!
    projectType: ProjectType!
    jiraProjectKey: String
    atlassianProjectKey: String
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

  type WorkHistoryEntry {
    id: Int!
    date: String!
    user: User!
    project: Project!
    scheduleName: String!
  }

  type WorkHistoryAdjacentDates {
    previous: String
    next: String
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

  type Space {
    id: String!
    name: String!
    email: String!
    image: String
    isOwner: Boolean!
  }

  type SpaceMember {
    id: Int!
    authId: String!
    email: String!
    name: String!
    image: String
    createdAt: String!
  }

  type ProjectChecklistItem {
    key: String!
    phase: String!
    description: String!
    completed: Boolean!
    skipped: Boolean!
    completedBy: String
    completedAt: String
  }

  type DateRange {
    start: String!
    end: String!
    scheduleName: String!
    scheduleId: Int!
  }

  type ProjectAssignment {
    user: User!
    teamName: String
    dateRanges: [DateRange!]!
  }

  type UserScheduleEntry {
    project: Project!
    dateRanges: [DateRange!]!
  }

  type PerformanceCycle {
    id: Int!
    title: String!
    cycleMonth: String!
    users: [User!]!
    createdAt: String!
  }

  input CreatePerformanceCycleInput {
    title: String!
    cycleMonth: String!
    userIds: [Int!]!
  }

  input UpdatePerformanceCycleInput {
    title: String!
    cycleMonth: String!
    userIds: [Int!]!
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
    workHistory(date: String!): [WorkHistoryEntry!]!
    workHistoryDates(startDate: String!, endDate: String!): [String!]!
    workHistoryAdjacentDates(date: String!): WorkHistoryAdjacentDates!
    projectAssignments(projectId: Int!): [ProjectAssignment!]!
    userSchedule(userId: Int!): [UserScheduleEntry!]!
    userWorkHistory(userId: Int!, limit: Int): [WorkHistoryEntry!]!
    me: SessionInfo
    mySpaces: [Space!]!
    spaceMembers: [SpaceMember!]!
    jobLevelLimits: [JobLevelLimit!]!
    jiraConfig: JiraConfig
    jiraIssues(projectId: Int!): [JiraIssue!]!
    jiraTransitions(issueKey: String!): [JiraTransition!]!
    searchJiraUsers(query: String!): [JiraUser!]!
    atlassianProject(projectId: Int!): AtlassianProjectData
    projectChecklist(projectId: Int!): [ProjectChecklistItem!]!
    leaveAssignments(startDate: String!, endDate: String!): [LeaveAssignment!]!
    onCallAssignments(startDate: String!, endDate: String!): [OnCallAssignment!]!
    scheduledProjects(weekStart: String!): [ScheduledProject!]!
    projectAtlassianStatuses(projectIds: [Int!]!): [ProjectAtlassianStatus!]!
    performanceCycles: [PerformanceCycle!]!
    performanceCycle(id: Int!): PerformanceCycle
  }

  type ScheduledProject {
    projectId: Int!
    projectName: String!
    color: String!
    status: ProjectStatus!
    assignees: [String!]!
    targetDate: String
  }

  type ProjectAtlassianStatus {
    projectId: Int!
    lastUpdateDate: String
    atlassianStatus: String
    dueDate: String
  }

  type LeaveAssignment {
    userId: Int!
    userName: String!
    projectName: String!
    weekStart: String!
  }

  type OnCallAssignment {
    userId: Int!
    userName: String!
    weekStart: String!
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
    updateWorkHistoryEntry(id: Int!, projectId: Int!): WorkHistoryEntry!
    addWorkHistoryEntries(userId: Int!, projectId: Int!, startDate: String!, endDate: String!): [WorkHistoryEntry!]!
    deleteWorkHistoryEntry(id: Int!): Boolean!
    addProjectLink(projectId: Int!, url: String!): ProjectLink!
    removeProjectLink(id: Int!): Boolean!
    linkAuthUser(appUserId: Int!): Boolean!
    addSpaceMember(email: String!): SpaceMember!
    removeSpaceMember(memberAuthId: String!): Boolean!
    leaveSpace(ownerAuthId: String!): Boolean!
    setJobLevelLimit(jobLevel: JobLevel!, limitMonths: Int!): JobLevelLimit!
    saveJiraConfig(domain: String!, email: String!, apiToken: String!, storyPointsFieldId: String): JiraConfig!
    removeJiraConfig: Boolean!
    transitionJiraIssue(issueKey: String!, transitionId: String!): Boolean!
    assignJiraIssue(issueKey: String!, accountId: String): Boolean!
    toggleProjectChecklistItem(projectId: Int!, itemKey: String!): Boolean!
    skipProjectChecklistItem(projectId: Int!, itemKey: String!): Boolean!
    updateProjectTargetDate(id: Int!, targetDate: String!): Project!
    updateProjectColor(id: Int!, color: String!): Project!
    deleteMyAccount: Boolean!
    createPerformanceCycle(input: CreatePerformanceCycleInput!): PerformanceCycle!
    updatePerformanceCycle(id: Int!, input: UpdatePerformanceCycleInput!): PerformanceCycle!
    deletePerformanceCycle(id: Int!): Boolean!
    reorderPerformanceCycleUsers(cycleId: Int!, userIds: [Int!]!): Boolean!
    setPerformanceCycleMemberRating(cycleId: Int!, userId: Int!, rating: String): Boolean!
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

const projectTypeToDb: Record<string, string> = {
  FeatureDevelopment: "Feature Development",
  Maintenance: "Maintenance",
  Other: "Other",
};

const projectTypeFromDb: Record<string, string> = {
  "Feature Development": "FeatureDevelopment",
  Maintenance: "Maintenance",
  Other: "Other",
};

const CHECKLIST_TEMPLATE = [
  { key: "wonder-1", phase: "Wonder", description: "Create a Project Poster" },
  { key: "wonder-2", phase: "Wonder", description: "Create the parent epic to track all tickets" },
  { key: "wonder-3", phase: "Wonder", description: "Create a Slack channel for the project" },
  { key: "wonder-4", phase: "Wonder", description: "Create initial designs (if needed)" },
  { key: "wonder-5", phase: "Wonder", description: "Hold a kickoff meeting" },
  { key: "explore-1", phase: "Explore", description: "Engineering DRI / feature lead reviews the project details / designs" },
  { key: "explore-2", phase: "Explore", description: "Hold a design review meeting if more detail is needed" },
  { key: "explore-3", phase: "Explore", description: "Create a \"Decision Registry\" if this is a large project" },
  { key: "explore-4", phase: "Explore", description: "Create a project breakdown list for all the tasks" },
  { key: "explore-5", phase: "Explore", description: "Create any Decision documents necessary to determine engineering approaches" },
  { key: "explore-6", phase: "Explore", description: "Determine if we need any teams to commit for dependencies identified" },
  { key: "explore-7", phase: "Explore", description: "Estimate the engineering work" },
  { key: "explore-7a", phase: "Explore", description: "Create an instrumentation spec which covers what we want to track with analytics events (for product-driven projects)" },
  { key: "explore-8", phase: "Explore", description: "Create timeline gantt" },
  { key: "explore-9", phase: "Explore", description: "Engineering and product collaborate to create phases/milestones, if warranted" },
  { key: "explore-10", phase: "Explore", description: "Convert the estimates into tickets under the epic" },
  { key: "explore-11", phase: "Explore", description: "Check in with your manager to review before moving onto the next phases" },
  { key: "make-1", phase: "Make", description: "Schedule a weekly (or fortnightly) sync meeting with stakeholders" },
  { key: "make-2", phase: "Make", description: "Create a roll-out plan" },
  { key: "make-3", phase: "Make", description: "Schedule and hold a bug-bash to identify any outstanding bugs before launch" },
  { key: "make-4", phase: "Make", description: "Roll it out!" },
];

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

const SYSTEM_PROJECTS = [
  { name: "On Call", projectType: "Maintenance", color: "orange" },
  { name: "Leave (Standard)", projectType: "Other", color: "cyan" },
  { name: "Leave (Extended)", projectType: "Other", color: "purple" },
  { name: "Other", projectType: "Other", color: "teal" },
];

async function ensureSystemProjects(ownerId: string) {
  const existing = await db.select().from(projects).where(and(eq(projects.ownerId, ownerId), eq(projects.isSystem, true)));
  if (existing.length >= SYSTEM_PROJECTS.length) return;

  const existingNames = new Set(existing.map((p) => p.name));
  const missing = SYSTEM_PROJECTS.filter((sp) => !existingNames.has(sp.name));
  if (missing.length === 0) return;

  // Find the owner's own user record to use as DRI (prefer auth-linked, fallback to first user)
  const [ownerUser] = await db.select().from(users).where(and(eq(users.authUserId, ownerId), eq(users.ownerId, ownerId)));
  const driUser = ownerUser ?? (await db.select().from(users).where(eq(users.ownerId, ownerId)).limit(1))[0];
  if (!driUser) return; // No user records yet — skip seeding

  for (const sp of missing) {
    await db.insert(projects).values({
      name: sp.name,
      targetDate: "2099-12-31",
      driId: driUser.id,
      status: "Make",
      color: sp.color,
      projectType: sp.projectType,
      isSystem: true,
      ownerId,
    });
  }
}

async function mapProjectFromDb(projectRow: typeof projects.$inferSelect) {
  const [driRow] = projectRow.driId != null
    ? await db.select().from(users).where(eq(users.id, projectRow.driId))
    : [];
  const memberRows = await db
    .select({ user: users })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectRow.id));
  const linkRows = await db.select().from(projectLinks).where(eq(projectLinks.projectId, projectRow.id));

  return {
    id: projectRow.id,
    name: projectRow.name,
    targetDate: projectRow.targetDate,
    dri: driRow ? mapUserFromDb(driRow) : null,
    status: projectRow.status,
    color: projectRow.color,
    projectType: projectTypeFromDb[projectRow.projectType] ?? "FeatureDevelopment",
    isSystem: projectRow.isSystem,
    jiraProjectKey: projectRow.jiraProjectKey ?? null,
    atlassianProjectKey: projectRow.atlassianProjectKey ?? null,
    members: memberRows.map((r) => mapUserFromDb(r.user)),
    links: linkRows.map((l) => ({ id: l.id, url: l.url, createdAt: l.createdAt.toISOString() })),
    createdAt: projectRow.createdAt.toISOString(),
  };
}

async function mapPerformanceCycleFromDb(row: typeof performanceCycles.$inferSelect) {
  const memberRows = await db
    .select({ user: users, rating: performanceCycleMembers.rating })
    .from(performanceCycleMembers)
    .innerJoin(users, eq(performanceCycleMembers.userId, users.id))
    .where(eq(performanceCycleMembers.cycleId, row.id))
    .orderBy(asc(performanceCycleMembers.sortOrder));
  return {
    id: row.id,
    title: row.title,
    cycleMonth: row.cycleMonth,
    users: memberRows.map((r) => ({ ...mapUserFromDb(r.user), rating: r.rating })),
    createdAt: row.createdAt.toISOString(),
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
      await ensureSystemProjects(ownerId);
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
      const rows = await db.select().from(schedules).where(eq(schedules.ownerId, ownerId)).orderBy(desc(schedules.year), desc(schedules.quarter));
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
    workHistory: async (_: unknown, { date }: { date: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db
        .select({
          id: workHistory.id,
          date: workHistory.date,
          userId: workHistory.userId,
          projectId: workHistory.projectId,
          scheduleId: workHistory.scheduleId,
          manuallyEdited: workHistory.manuallyEdited,
        })
        .from(workHistory)
        .where(and(eq(workHistory.ownerId, ownerId), eq(workHistory.date, date)));

      return Promise.all(
        rows.map(async (row) => {
          const [userRow] = await db.select().from(users).where(eq(users.id, row.userId));
          const [projectRow] = await db.select().from(projects).where(eq(projects.id, row.projectId));
          let scheduleName = "Manually Entered";
          if (!row.manuallyEdited) {
            const [scheduleRow] = await db.select().from(schedules).where(eq(schedules.id, row.scheduleId));
            scheduleName = scheduleRow?.name ?? "Unknown";
          }
          return {
            id: row.id,
            date: row.date,
            user: userRow ? mapUserFromDb(userRow) : null,
            project: projectRow ? { id: projectRow.id, name: projectRow.name, color: projectRow.color, targetDate: projectRow.targetDate, status: projectRow.status, createdAt: projectRow.createdAt.toISOString(), dri: null, members: [] } : null,
            scheduleName,
          };
        }),
      );
    },
    workHistoryDates: async (_: unknown, { startDate, endDate }: { startDate: string; endDate: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db
        .selectDistinct({ date: workHistory.date })
        .from(workHistory)
        .where(and(
          eq(workHistory.ownerId, ownerId),
          gte(workHistory.date, startDate),
          lte(workHistory.date, endDate),
        ));
      return rows.map((r) => r.date);
    },
    workHistoryAdjacentDates: async (_: unknown, { date }: { date: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [prevRow] = await db
        .selectDistinct({ date: workHistory.date })
        .from(workHistory)
        .where(and(eq(workHistory.ownerId, ownerId), lt(workHistory.date, date)))
        .orderBy(desc(workHistory.date))
        .limit(1);
      const [nextRow] = await db
        .selectDistinct({ date: workHistory.date })
        .from(workHistory)
        .where(and(eq(workHistory.ownerId, ownerId), gt(workHistory.date, date)))
        .orderBy(asc(workHistory.date))
        .limit(1);
      return {
        previous: prevRow?.date ?? null,
        next: nextRow?.date ?? null,
      };
    },
    projectAssignments: async (_: unknown, { projectId }: { projectId: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      // Verify project ownership
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");

      // Get all assignments for this project, joined with schedule and user info
      const rows = await db
        .select({
          userId: scheduleAssignments.userId,
          weekStart: scheduleAssignments.weekStart,
          scheduleId: scheduleAssignments.scheduleId,
          scheduleName: schedules.name,
          user: users,
        })
        .from(scheduleAssignments)
        .innerJoin(schedules, eq(scheduleAssignments.scheduleId, schedules.id))
        .innerJoin(users, eq(scheduleAssignments.userId, users.id))
        .where(eq(scheduleAssignments.projectId, projectId))
        .orderBy(asc(users.fullName), asc(scheduleAssignments.weekStart));

      if (rows.length === 0) return [];

      // Group by userId, then by scheduleId, merge consecutive weeks into ranges
      const byUser = new Map<number, { user: typeof users.$inferSelect; bySchedule: Map<number, { scheduleName: string; weeks: string[] }> }>();
      for (const row of rows) {
        if (!byUser.has(row.userId)) {
          byUser.set(row.userId, { user: row.user, bySchedule: new Map() });
        }
        const userEntry = byUser.get(row.userId)!;
        if (!userEntry.bySchedule.has(row.scheduleId)) {
          userEntry.bySchedule.set(row.scheduleId, { scheduleName: row.scheduleName, weeks: [] });
        }
        userEntry.bySchedule.get(row.scheduleId)!.weeks.push(row.weekStart);
      }

      // Look up team names for all assigned users
      const userIds = [...byUser.keys()];
      const teamRows = await db
        .select({ userId: teamMembers.userId, teamName: teams.name })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(inArray(teamMembers.userId, userIds));
      const userTeamMap = new Map<number, string>();
      for (const row of teamRows) {
        userTeamMap.set(row.userId, row.teamName);
      }

      const results = [];
      for (const [userId, { user: userRow, bySchedule }] of byUser) {
        const dateRanges = mergeWeekRanges(bySchedule);
        results.push({ user: mapUserFromDb(userRow), teamName: userTeamMap.get(userId) ?? null, dateRanges });
      }

      return results;
    },
    userSchedule: async (_: unknown, { userId }: { userId: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      // Verify user ownership
      const [userRow] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.ownerId, ownerId)));
      if (!userRow) throw new Error("User not found");

      // Get all upcoming assignments for this user (from current week onwards)
      const today = new Date().toISOString().split("T")[0];
      const rows = await db
        .select({
          projectId: scheduleAssignments.projectId,
          weekStart: scheduleAssignments.weekStart,
          scheduleId: scheduleAssignments.scheduleId,
          scheduleName: schedules.name,
        })
        .from(scheduleAssignments)
        .innerJoin(schedules, eq(scheduleAssignments.scheduleId, schedules.id))
        .where(and(
          eq(scheduleAssignments.userId, userId),
          gte(scheduleAssignments.weekStart, today),
        ))
        .orderBy(asc(scheduleAssignments.weekStart));

      if (rows.length === 0) return [];

      // Group by projectId, then by scheduleId
      const byProject = new Map<number, { bySchedule: Map<number, { scheduleName: string; weeks: string[] }> }>();
      for (const row of rows) {
        if (!byProject.has(row.projectId)) {
          byProject.set(row.projectId, { bySchedule: new Map() });
        }
        const entry = byProject.get(row.projectId)!;
        if (!entry.bySchedule.has(row.scheduleId)) {
          entry.bySchedule.set(row.scheduleId, { scheduleName: row.scheduleName, weeks: [] });
        }
        entry.bySchedule.get(row.scheduleId)!.weeks.push(row.weekStart);
      }

      const results = [];
      for (const [projectId, { bySchedule }] of byProject) {
        const [projectRow] = await db.select().from(projects).where(eq(projects.id, projectId));
        if (!projectRow) continue;
        const dateRanges = mergeWeekRanges(bySchedule);
        results.push({ project: await mapProjectFromDb(projectRow), dateRanges });
      }

      return results;
    },
    userWorkHistory: async (_: unknown, { userId, limit: rowLimit }: { userId: number; limit?: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [userRow] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.ownerId, ownerId)));
      if (!userRow) throw new Error("User not found");

      const rows = await db
        .select()
        .from(workHistory)
        .where(and(eq(workHistory.ownerId, ownerId), eq(workHistory.userId, userId)))
        .orderBy(desc(workHistory.date))
        .limit(rowLimit ?? 10);

      return Promise.all(
        rows.map(async (row) => {
          const [projectRow] = await db.select().from(projects).where(eq(projects.id, row.projectId));
          let scheduleName = "Manually Entered";
          if (!row.manuallyEdited) {
            const [scheduleRow] = await db.select().from(schedules).where(eq(schedules.id, row.scheduleId));
            scheduleName = scheduleRow?.name ?? "Unknown";
          }
          return {
            id: row.id,
            date: row.date,
            user: mapUserFromDb(userRow),
            project: projectRow ? { id: projectRow.id, name: projectRow.name, color: projectRow.color, targetDate: projectRow.targetDate, status: projectRow.status, createdAt: projectRow.createdAt.toISOString(), dri: null, members: [] } : null,
            scheduleName,
          };
        }),
      );
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
    mySpaces: async (_: unknown, __: unknown, context: Context) => {
      const { user } = requireAuth(context);
      // Own space
      const ownSpace = { id: user.id, name: user.name, email: user.email, image: user.image ?? null, isOwner: true };
      // Spaces where this user is a member
      const memberships = await db
        .select({ spaceOwnerId: spaceMembers.spaceOwnerId })
        .from(spaceMembers)
        .where(eq(spaceMembers.memberAuthId, user.id));
      if (memberships.length === 0) return [ownSpace];
      const ownerIds = memberships.map((m) => m.spaceOwnerId);
      const owners = await db.select().from(authUser).where(inArray(authUser.id, ownerIds));
      const otherSpaces = owners.map((o) => ({ id: o.id, name: o.name, email: o.email, image: o.image ?? null, isOwner: false }));
      return [ownSpace, ...otherSpaces];
    },
    spaceMembers: async (_: unknown, __: unknown, context: Context) => {
      const { user } = requireAuth(context);
      // Only show members of your own space
      const rows = await db
        .select()
        .from(spaceMembers)
        .where(eq(spaceMembers.spaceOwnerId, user.id));
      if (rows.length === 0) return [];
      const memberIds = rows.map((r) => r.memberAuthId);
      const memberUsers = await db.select().from(authUser).where(inArray(authUser.id, memberIds));
      const userMap = new Map(memberUsers.map((u) => [u.id, u]));
      return rows.map((r) => {
        const u = userMap.get(r.memberAuthId);
        return { id: r.id, authId: r.memberAuthId, email: u?.email ?? "", name: u?.name ?? "", image: u?.image ?? null, createdAt: r.createdAt.toISOString() };
      });
    },
    jobLevelLimits: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const levels = ["Junior", "Mid", "Senior", "Staff", "Principal"] as const;
      const rows = await db.select().from(jobLevelLimits).where(eq(jobLevelLimits.ownerId, ownerId));
      const map = new Map(rows.map((r) => [r.jobLevel, r.limitMonths]));
      return levels.map((level) => ({ jobLevel: level, limitMonths: map.get(level) ?? 0 }));
    },
    jiraConfig: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!row) return null;
      return { id: row.id, domain: row.domain, email: row.email, hasToken: true, storyPointsFieldId: row.storyPointsFieldId ?? null };
    },
    jiraIssues: async (_: unknown, { projectId }: { projectId: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      if (!project.jiraProjectKey) return [];
      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) throw new Error("Jira is not configured");
      return fetchJiraIssues(config.domain, config.email, config.apiToken, project.jiraProjectKey, config.storyPointsFieldId ?? null);
    },
    jiraTransitions: async (_: unknown, { issueKey }: { issueKey: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) throw new Error("Jira is not configured");
      return fetchJiraTransitions(config.domain, config.email, config.apiToken, issueKey);
    },
    searchJiraUsers: async (_: unknown, { query }: { query: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) throw new Error("Jira is not configured");
      return searchJiraUsers(config.domain, config.email, config.apiToken, query);
    },
    atlassianProject: async (_: unknown, { projectId }: { projectId: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      if (!project.atlassianProjectKey) return null;

      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) throw new Error("Jira/Atlassian is not configured");

      return fetchAtlassianProject(config.domain, config.email, config.apiToken, project.atlassianProjectKey);
    },
    projectChecklist: async (_: unknown, { projectId }: { projectId: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      const completions = await db.select().from(projectChecklistCompletions).where(eq(projectChecklistCompletions.projectId, projectId));
      const completionMap = new Map(completions.map((c) => [c.itemKey, c]));
      return CHECKLIST_TEMPLATE.map((item) => {
        const completion = completionMap.get(item.key);
        return {
          ...item,
          completed: completion?.status === "completed",
          skipped: completion?.status === "skipped",
          completedBy: completion?.completedBy ?? null,
          completedAt: completion?.completedAt ?? null,
        };
      });
    },
    leaveAssignments: async (_: unknown, { startDate, endDate }: { startDate: string; endDate: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const ownerSchedules = await db
        .select({ id: schedules.id })
        .from(schedules)
        .where(eq(schedules.ownerId, ownerId));
      if (ownerSchedules.length === 0) return [];
      const scheduleIds = ownerSchedules.map((s) => s.id);

      const rows = await db
        .select({
          userId: scheduleAssignments.userId,
          userName: users.fullName,
          projectName: projects.name,
          weekStart: scheduleAssignments.weekStart,
        })
        .from(scheduleAssignments)
        .innerJoin(projects, eq(scheduleAssignments.projectId, projects.id))
        .innerJoin(users, eq(scheduleAssignments.userId, users.id))
        .where(
          and(
            inArray(scheduleAssignments.scheduleId, scheduleIds),
            gte(scheduleAssignments.weekStart, startDate),
            lte(scheduleAssignments.weekStart, endDate),
            eq(projects.isSystem, true),
            or(
              eq(projects.name, "Leave (Standard)"),
              eq(projects.name, "Leave (Extended)"),
            ),
          ),
        );

      return rows;
    },
    onCallAssignments: async (_: unknown, { startDate, endDate }: { startDate: string; endDate: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const ownerSchedules = await db
        .select({ id: schedules.id })
        .from(schedules)
        .where(eq(schedules.ownerId, ownerId));
      if (ownerSchedules.length === 0) return [];
      const scheduleIds = ownerSchedules.map((s) => s.id);

      const rows = await db
        .select({
          userId: scheduleAssignments.userId,
          userName: users.fullName,
          weekStart: scheduleAssignments.weekStart,
        })
        .from(scheduleAssignments)
        .innerJoin(projects, eq(scheduleAssignments.projectId, projects.id))
        .innerJoin(users, eq(scheduleAssignments.userId, users.id))
        .where(
          and(
            inArray(scheduleAssignments.scheduleId, scheduleIds),
            gte(scheduleAssignments.weekStart, startDate),
            lte(scheduleAssignments.weekStart, endDate),
            eq(projects.isSystem, true),
            eq(projects.name, "On Call"),
          ),
        );

      return rows;
    },
    scheduledProjects: async (_: unknown, { weekStart }: { weekStart: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const ownerSchedules = await db
        .select({ id: schedules.id })
        .from(schedules)
        .where(eq(schedules.ownerId, ownerId));
      if (ownerSchedules.length === 0) return [];
      const scheduleIds = ownerSchedules.map((s) => s.id);

      const rows = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          color: projects.color,
          status: projects.status,
          targetDate: projects.targetDate,
          userName: users.fullName,
        })
        .from(scheduleAssignments)
        .innerJoin(projects, eq(scheduleAssignments.projectId, projects.id))
        .innerJoin(users, eq(scheduleAssignments.userId, users.id))
        .where(
          and(
            inArray(scheduleAssignments.scheduleId, scheduleIds),
            eq(scheduleAssignments.weekStart, weekStart),
            eq(projects.isSystem, false),
          ),
        )
        .orderBy(asc(projects.name), asc(users.fullName));

      const byProject = new Map<number, { projectName: string; color: string; status: string; targetDate: string | null; assignees: string[] }>();
      for (const row of rows) {
        if (!byProject.has(row.projectId)) {
          byProject.set(row.projectId, { projectName: row.projectName, color: row.color, status: row.status, targetDate: row.targetDate, assignees: [] });
        }
        byProject.get(row.projectId)!.assignees.push(row.userName);
      }

      return [...byProject.entries()].map(([projectId, data]) => ({
        projectId,
        ...data,
      }));
    },
    projectAtlassianStatuses: async (_: unknown, { projectIds }: { projectIds: number[] }, context: Context) => {
      const ownerId = getOwnerId(context);
      if (projectIds.length === 0) return [];

      const projectRows = await db
        .select({ id: projects.id, atlassianProjectKey: projects.atlassianProjectKey })
        .from(projects)
        .where(and(eq(projects.ownerId, ownerId), inArray(projects.id, projectIds)));

      const withKey = projectRows.filter((p) => p.atlassianProjectKey);
      if (withKey.length === 0) return [];

      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) return [];

      const results = await Promise.allSettled(
        withKey.map(async (p) => {
          const data = await fetchAtlassianProject(config.domain, config.email, config.apiToken, p.atlassianProjectKey!);
          return {
            projectId: p.id,
            lastUpdateDate: data.latestUpdate?.date ?? null,
            atlassianStatus: data.status ?? null,
            dueDate: data.dueDate ?? null,
          };
        }),
      );

      return results
        .filter((r): r is PromiseFulfilledResult<{ projectId: number; lastUpdateDate: string | null; atlassianStatus: string | null }> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    performanceCycles: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const rows = await db.select().from(performanceCycles).where(eq(performanceCycles.ownerId, ownerId)).orderBy(desc(performanceCycles.createdAt));
      return Promise.all(rows.map(mapPerformanceCycleFromDb));
    },
    performanceCycle: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db.select().from(performanceCycles).where(and(eq(performanceCycles.id, id), eq(performanceCycles.ownerId, ownerId)));
      if (!row) return null;
      return mapPerformanceCycleFromDb(row);
    },
  },
  Mutation: {
    createUser: async (
      _: unknown,
      { input }: { input: { fullName: string; craftAbility: string; jobLevel: string; levelStartDate?: string; craftFocus: string } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .insert(users)
        .values({
          fullName: input.fullName,
          craftAbility: craftAbilityToDb[input.craftAbility] ?? input.craftAbility,
          jobLevel: input.jobLevel,
          levelStartDate: input.levelStartDate ?? null,
          craftFocus: craftFocusToDb[input.craftFocus] ?? input.craftFocus,
          ownerId,
        })
        .returning();
      return mapUserFromDb(row);
    },
    updateUser: async (
      _: unknown,
      { id, input }: { id: number; input: { fullName: string; craftAbility: string; jobLevel: string; levelStartDate?: string; craftFocus: string } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .update(users)
        .set({
          fullName: input.fullName,
          craftAbility: craftAbilityToDb[input.craftAbility] ?? input.craftAbility,
          jobLevel: input.jobLevel,
          levelStartDate: input.levelStartDate ?? null,
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

      // Null out DRI on any projects where this user is the DRI
      await db.update(projects).set({ driId: null }).where(and(eq(projects.driId, id), eq(projects.ownerId, ownerId)));

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
      { input }: { input: { name: string; targetDate: string; driId: number; status: string; color: string; projectType?: string; jiraProjectKey?: string; atlassianProjectKey?: string } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);

      const [projectRow] = await db
        .insert(projects)
        .values({
          name: input.name,
          targetDate: input.targetDate,
          driId: input.driId,
          status: input.status,
          color: input.color,
          projectType: projectTypeToDb[input.projectType ?? "FeatureDevelopment"] ?? "Feature Development",
          jiraProjectKey: input.jiraProjectKey ?? null,
          atlassianProjectKey: input.atlassianProjectKey ?? null,
          ownerId,
        })
        .returning();

      // Add DRI as sole member
      await db.insert(projectMembers)
        .values([{ projectId: projectRow.id, userId: input.driId }]);

      return mapProjectFromDb(projectRow);
    },
    updateProject: async (
      _: unknown,
      { id, input }: { id: number; input: { name: string; targetDate: string; driId: number; status: string; color: string; projectType: string; jiraProjectKey?: string; atlassianProjectKey?: string } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);

      // Guard: system projects cannot be edited
      const [existing] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
      if (existing?.isSystem) throw new Error("System projects cannot be edited");

      const [projectRow] = await db
        .update(projects)
        .set({
          name: input.name,
          targetDate: input.targetDate,
          driId: input.driId,
          status: input.status,
          color: input.color,
          projectType: projectTypeToDb[input.projectType] ?? "Feature Development",
          jiraProjectKey: input.jiraProjectKey ?? null,
          atlassianProjectKey: input.atlassianProjectKey ?? null,
        })
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
        .returning();
      if (!projectRow) throw new Error("Project not found");

      // Ensure DRI is a member (if one is set)
      if (input.driId != null) {
        const existingMembers = await db.select().from(projectMembers).where(eq(projectMembers.projectId, id));
        if (!existingMembers.some((m) => m.userId === input.driId)) {
          await db.insert(projectMembers).values([{ projectId: id, userId: input.driId }]);
        }
      }

      return mapProjectFromDb(projectRow);
    },
    deleteProject: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);

      // Guard: system projects cannot be deleted
      const [existing] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
      if (existing?.isSystem) throw new Error("System projects cannot be deleted");

      const deleted = await db.delete(projects).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    createSchedule: async (
      _: unknown,
      { input }: { input: { name: string; year: number; quarter: number } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [existing] = await db.select().from(schedules).where(and(eq(schedules.ownerId, ownerId), eq(schedules.year, input.year), eq(schedules.quarter, input.quarter)));
      if (existing) throw new Error(`A schedule for Q${input.quarter} ${input.year} already exists`);
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
      const [conflict] = await db.select().from(schedules).where(and(eq(schedules.ownerId, ownerId), eq(schedules.year, input.year), eq(schedules.quarter, input.quarter)));
      if (conflict && conflict.id !== id) throw new Error(`A schedule for Q${input.quarter} ${input.year} already exists`);
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
    updateWorkHistoryEntry: async (
      _: unknown,
      { id, projectId }: { id: number; projectId: number },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .update(workHistory)
        .set({ projectId, manuallyEdited: true })
        .where(and(eq(workHistory.id, id), eq(workHistory.ownerId, ownerId)))
        .returning();
      if (!row) throw new Error("Work history entry not found");

      const [userRow] = await db.select().from(users).where(eq(users.id, row.userId));
      const [projectRow] = await db.select().from(projects).where(eq(projects.id, row.projectId));
      return {
        id: row.id,
        date: row.date,
        user: userRow ? mapUserFromDb(userRow) : null,
        project: projectRow ? { id: projectRow.id, name: projectRow.name, color: projectRow.color, targetDate: projectRow.targetDate, status: projectRow.status, createdAt: projectRow.createdAt.toISOString(), dri: null, members: [] } : null,
        scheduleName: "Manually Entered",
      };
    },
    addWorkHistoryEntries: async (
      _: unknown,
      { userId, projectId, startDate, endDate }: { userId: number; projectId: number; startDate: string; endDate: string },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      // Verify user and project ownership
      const [userRow] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.ownerId, ownerId)));
      if (!userRow) throw new Error("User not found");
      const [projectRow] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!projectRow) throw new Error("Project not found");

      // Generate all dates in the range
      const dates = generateDateRange(startDate, endDate);

      const results = [];
      for (const date of dates) {
        const [row] = await db
          .insert(workHistory)
          .values({ userId, projectId, date, manuallyEdited: true, ownerId })
          .onConflictDoUpdate({
            target: [workHistory.userId, workHistory.date],
            set: { projectId, manuallyEdited: true, scheduleId: null },
          })
          .returning();
        results.push({
          id: row.id,
          date: row.date,
          user: mapUserFromDb(userRow),
          project: { id: projectRow.id, name: projectRow.name, color: projectRow.color, targetDate: projectRow.targetDate, status: projectRow.status, createdAt: projectRow.createdAt.toISOString(), dri: null, members: [] },
          scheduleName: "Manually Entered",
        });
      }

      return results;
    },
    deleteWorkHistoryEntry: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const deleted = await db.delete(workHistory).where(and(eq(workHistory.id, id), eq(workHistory.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    addProjectLink: async (_: unknown, { projectId, url }: { projectId: number; url: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      // Verify project ownership
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      const [row] = await db.insert(projectLinks).values({ projectId, url }).returning();
      return { id: row.id, url: row.url, createdAt: row.createdAt.toISOString() };
    },
    removeProjectLink: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      // Verify the link belongs to a project the user owns
      const [link] = await db.select().from(projectLinks).where(eq(projectLinks.id, id));
      if (!link) throw new Error("Link not found");
      const [project] = await db.select().from(projects).where(and(eq(projects.id, link.projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      await db.delete(projectLinks).where(eq(projectLinks.id, id));
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
    saveJiraConfig: async (
      _: unknown,
      { domain, email, apiToken, storyPointsFieldId }: { domain: string; email: string; apiToken: string; storyPointsFieldId?: string | null },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [existing] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (existing) {
        const [row] = await db
          .update(jiraConfig)
          .set({ domain, email, apiToken, storyPointsFieldId: storyPointsFieldId ?? null })
          .where(eq(jiraConfig.ownerId, ownerId))
          .returning();
        return { id: row.id, domain: row.domain, email: row.email, hasToken: true, storyPointsFieldId: row.storyPointsFieldId ?? null };
      }
      const [row] = await db
        .insert(jiraConfig)
        .values({ ownerId, domain, email, apiToken, storyPointsFieldId: storyPointsFieldId ?? null })
        .returning();
      return { id: row.id, domain: row.domain, email: row.email, hasToken: true, storyPointsFieldId: row.storyPointsFieldId ?? null };
    },
    removeJiraConfig: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);
      const deleted = await db.delete(jiraConfig).where(eq(jiraConfig.ownerId, ownerId)).returning();
      return deleted.length > 0;
    },
    setJobLevelLimit: async (_: unknown, { jobLevel, limitMonths }: { jobLevel: string; limitMonths: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .insert(jobLevelLimits)
        .values({ ownerId, jobLevel, limitMonths })
        .onConflictDoUpdate({ target: [jobLevelLimits.ownerId, jobLevelLimits.jobLevel], set: { limitMonths } })
        .returning();
      return { jobLevel: row.jobLevel, limitMonths: row.limitMonths };
    },
    transitionJiraIssue: async (_: unknown, { issueKey, transitionId }: { issueKey: string; transitionId: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      requireAuth(context);
      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) throw new Error("Jira is not configured");
      await transitionJiraIssue(config.domain, config.email, config.apiToken, issueKey, transitionId);
      return true;
    },
    assignJiraIssue: async (_: unknown, { issueKey, accountId }: { issueKey: string; accountId: string | null }, context: Context) => {
      const ownerId = getOwnerId(context);
      requireAuth(context);
      const [config] = await db.select().from(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));
      if (!config) throw new Error("Jira is not configured");
      await assignJiraIssue(config.domain, config.email, config.apiToken, issueKey, accountId);
      return true;
    },
    addSpaceMember: async (_: unknown, { email }: { email: string }, context: Context) => {
      const { user } = requireAuth(context);
      // Look up the target user by email
      const [targetUser] = await db.select().from(authUser).where(eq(authUser.email, email));
      if (!targetUser) throw new Error("No user found with that email");
      if (targetUser.id === user.id) throw new Error("You cannot add yourself");
      // Check for existing membership
      const [existing] = await db.select().from(spaceMembers).where(and(eq(spaceMembers.spaceOwnerId, user.id), eq(spaceMembers.memberAuthId, targetUser.id)));
      if (existing) throw new Error("This user is already a member of your space");
      const [row] = await db.insert(spaceMembers).values({ spaceOwnerId: user.id, memberAuthId: targetUser.id }).returning();
      return { id: row.id, authId: targetUser.id, email: targetUser.email, name: targetUser.name, image: targetUser.image ?? null, createdAt: row.createdAt.toISOString() };
    },
    removeSpaceMember: async (_: unknown, { memberAuthId }: { memberAuthId: string }, context: Context) => {
      const { user } = requireAuth(context);
      const deleted = await db.delete(spaceMembers).where(and(eq(spaceMembers.spaceOwnerId, user.id), eq(spaceMembers.memberAuthId, memberAuthId))).returning();
      return deleted.length > 0;
    },
    leaveSpace: async (_: unknown, { ownerAuthId }: { ownerAuthId: string }, context: Context) => {
      const { user } = requireAuth(context);
      const deleted = await db.delete(spaceMembers).where(and(eq(spaceMembers.spaceOwnerId, ownerAuthId), eq(spaceMembers.memberAuthId, user.id))).returning();
      return deleted.length > 0;
    },
    toggleProjectChecklistItem: async (_: unknown, { projectId, itemKey }: { projectId: number; itemKey: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const { user } = requireAuth(context);
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      if (!CHECKLIST_TEMPLATE.some((t) => t.key === itemKey)) throw new Error("Invalid checklist item key");
      const [existing] = await db.select().from(projectChecklistCompletions).where(and(eq(projectChecklistCompletions.projectId, projectId), eq(projectChecklistCompletions.itemKey, itemKey)));
      if (existing?.status === "completed") {
        await db.delete(projectChecklistCompletions).where(eq(projectChecklistCompletions.id, existing.id));
        return false;
      }
      const today = new Date().toISOString().split("T")[0];
      if (existing) {
        await db.update(projectChecklistCompletions).set({ status: "completed", completedBy: user.email, completedAt: today }).where(eq(projectChecklistCompletions.id, existing.id));
      } else {
        await db.insert(projectChecklistCompletions).values({ projectId, itemKey, status: "completed", completedBy: user.email, completedAt: today });
      }
      return true;
    },
    skipProjectChecklistItem: async (_: unknown, { projectId, itemKey }: { projectId: number; itemKey: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const { user } = requireAuth(context);
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
      if (!project) throw new Error("Project not found");
      if (!CHECKLIST_TEMPLATE.some((t) => t.key === itemKey)) throw new Error("Invalid checklist item key");
      const [existing] = await db.select().from(projectChecklistCompletions).where(and(eq(projectChecklistCompletions.projectId, projectId), eq(projectChecklistCompletions.itemKey, itemKey)));
      if (existing?.status === "skipped") {
        await db.delete(projectChecklistCompletions).where(eq(projectChecklistCompletions.id, existing.id));
        return false;
      }
      const today = new Date().toISOString().split("T")[0];
      if (existing) {
        await db.update(projectChecklistCompletions).set({ status: "skipped", completedBy: user.email, completedAt: today }).where(eq(projectChecklistCompletions.id, existing.id));
      } else {
        await db.insert(projectChecklistCompletions).values({ projectId, itemKey, status: "skipped", completedBy: user.email, completedAt: today });
      }
      return true;
    },
    updateProjectTargetDate: async (_: unknown, { id, targetDate }: { id: number; targetDate: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [projectRow] = await db
        .update(projects)
        .set({ targetDate })
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
        .returning();
      if (!projectRow) throw new Error("Project not found");
      return mapProjectFromDb(projectRow);
    },
    updateProjectColor: async (_: unknown, { id, color }: { id: number; color: string }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [projectRow] = await db
        .update(projects)
        .set({ color })
        .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
        .returning();
      if (!projectRow) throw new Error("Project not found");
      return mapProjectFromDb(projectRow);
    },
    deleteMyAccount: async (_: unknown, __: unknown, context: Context) => {
      const ownerId = getOwnerId(context);

      // Delete Jira config
      await db.delete(jiraConfig).where(eq(jiraConfig.ownerId, ownerId));

      // Delete space memberships (both as owner and as member)
      await db.delete(spaceMembers).where(or(eq(spaceMembers.spaceOwnerId, ownerId), eq(spaceMembers.memberAuthId, ownerId)));

      // Delete app data in FK-safe order
      // 0. Work history (references users, projects, schedules)
      await db.delete(workHistory).where(eq(workHistory.ownerId, ownerId));

      // 1. Schedule assignments (references schedules, users, projects)
      const ownerScheduleIds = db.select({ id: schedules.id }).from(schedules).where(eq(schedules.ownerId, ownerId));
      await db.delete(scheduleAssignments).where(inArray(scheduleAssignments.scheduleId, ownerScheduleIds));

      // 2. Schedules
      await db.delete(schedules).where(eq(schedules.ownerId, ownerId));

      // 3. Project checklist completions and project members (reference projects)
      const ownerProjectIds = db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, ownerId));
      await db.delete(projectChecklistCompletions).where(inArray(projectChecklistCompletions.projectId, ownerProjectIds));
      await db.delete(projectMembers).where(inArray(projectMembers.projectId, ownerProjectIds));

      // 4. Projects
      await db.delete(projects).where(eq(projects.ownerId, ownerId));

      // 5. Team members (references teams, users)
      const ownerTeamIds = db.select({ id: teams.id }).from(teams).where(eq(teams.ownerId, ownerId));
      await db.delete(teamMembers).where(inArray(teamMembers.teamId, ownerTeamIds));

      // 6. Teams
      await db.delete(teams).where(eq(teams.ownerId, ownerId));

      // 7. App users
      await db.delete(users).where(eq(users.ownerId, ownerId));

      // Delete auth data
      await db.delete(session).where(eq(session.userId, ownerId));
      await db.delete(account).where(eq(account.userId, ownerId));
      await db.delete(authUser).where(eq(authUser.id, ownerId));

      return true;
    },
    createPerformanceCycle: async (
      _: unknown,
      { input }: { input: { title: string; cycleMonth: string; userIds: number[] } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .insert(performanceCycles)
        .values({ title: input.title, cycleMonth: input.cycleMonth, ownerId })
        .returning();
      if (input.userIds.length > 0) {
        await db.insert(performanceCycleMembers).values(input.userIds.map((userId, index) => ({ cycleId: row.id, userId, sortOrder: index })));
      }
      return mapPerformanceCycleFromDb(row);
    },
    updatePerformanceCycle: async (
      _: unknown,
      { id, input }: { id: number; input: { title: string; cycleMonth: string; userIds: number[] } },
      context: Context,
    ) => {
      const ownerId = getOwnerId(context);
      const [row] = await db
        .update(performanceCycles)
        .set({ title: input.title, cycleMonth: input.cycleMonth })
        .where(and(eq(performanceCycles.id, id), eq(performanceCycles.ownerId, ownerId)))
        .returning();
      if (!row) throw new Error("Performance cycle not found");
      await db.delete(performanceCycleMembers).where(eq(performanceCycleMembers.cycleId, id));
      if (input.userIds.length > 0) {
        await db.insert(performanceCycleMembers).values(input.userIds.map((userId, index) => ({ cycleId: id, userId, sortOrder: index })));
      }
      return mapPerformanceCycleFromDb(row);
    },
    deletePerformanceCycle: async (_: unknown, { id }: { id: number }, context: Context) => {
      const ownerId = getOwnerId(context);
      const deleted = await db.delete(performanceCycles).where(and(eq(performanceCycles.id, id), eq(performanceCycles.ownerId, ownerId))).returning();
      return deleted.length > 0;
    },
    reorderPerformanceCycleUsers: async (_: unknown, { cycleId, userIds }: { cycleId: number; userIds: number[] }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [cycle] = await db.select().from(performanceCycles).where(and(eq(performanceCycles.id, cycleId), eq(performanceCycles.ownerId, ownerId)));
      if (!cycle) throw new Error("Performance cycle not found");
      await Promise.all(
        userIds.map((userId, index) =>
          db.update(performanceCycleMembers).set({ sortOrder: index }).where(and(eq(performanceCycleMembers.cycleId, cycleId), eq(performanceCycleMembers.userId, userId)))
        )
      );
      return true;
    },
    setPerformanceCycleMemberRating: async (_: unknown, { cycleId, userId, rating }: { cycleId: number; userId: number; rating: string | null }, context: Context) => {
      const ownerId = getOwnerId(context);
      const [cycle] = await db.select().from(performanceCycles).where(and(eq(performanceCycles.id, cycleId), eq(performanceCycles.ownerId, ownerId)));
      if (!cycle) throw new Error("Performance cycle not found");
      await db.update(performanceCycleMembers)
        .set({ rating })
        .where(and(eq(performanceCycleMembers.cycleId, cycleId), eq(performanceCycleMembers.userId, userId)));
      return true;
    },
  },
};
