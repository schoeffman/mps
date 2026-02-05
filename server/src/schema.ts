import gql from "graphql-tag";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

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

  type Query {
    hello: String
    users: [User!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: Int!, input: UpdateUserInput!): User!
    deleteUser(id: Int!): Boolean!
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

export const resolvers = {
  Query: {
    hello: () => "Hello world from Apollo Server!",
    users: () => {
      const rows = db.select().from(users).all();
      return rows.map(mapUserFromDb);
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
  },
};
