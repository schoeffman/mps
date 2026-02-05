import gql from "graphql-tag";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db/index.js";
import { users, teams, teamMembers } from "./db/schema.js";

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

  type Query {
    hello: String
    users: [User!]!
    teams: [Team!]!
    team(id: Int!): Team
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: Int!, input: UpdateUserInput!): User!
    deleteUser(id: Int!): Boolean!
    createTeam(input: CreateTeamInput!): Team!
    updateTeam(id: Int!, input: UpdateTeamInput!): Team!
    deleteTeam(id: Int!): Boolean!
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

export const resolvers = {
  Query: {
    hello: () => "Hello world from Apollo Server!",
    users: () => {
      const rows = db.select().from(users).all();
      return rows.map(mapUserFromDb);
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
  },
};
