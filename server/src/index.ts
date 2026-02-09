import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { and, eq } from "drizzle-orm";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { typeDefs, resolvers, type Context } from "./schema.js";
import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { spaceMembers } from "./db/schema.js";
import { seedDemoDataForOwner } from "./db/seed-demo-data.js";
import { startWorkHistoryCron } from "./jobs/snapshot-work-history.js";

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const isProd = process.env.NODE_ENV === "production";

const app = express();

// Mount Better Auth handler before express.json (it parses its own body)
app.all("/api/auth/*", toNodeHandler(auth));

const server = new ApolloServer<Context>({ typeDefs, resolvers });
await server.start();

// Track which users have already been checked for demo data this server lifetime
const seededUsers = new Set<string>();

app.use(
  "/graphql",
  cors({ origin: CORS_ORIGIN, credentials: true }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      // Lazy-seed demo data on first authenticated request per user
      if (session && !seededUsers.has(session.user.id)) {
        seededUsers.add(session.user.id);
        try {
          await seedDemoDataForOwner(session.user.id);
        } catch (err) {
          console.error("Failed to seed demo data:", err);
        }
      }

      // Resolve active space from header
      let spaceOwnerId: string | null = null;
      if (session) {
        const requestedSpace = req.headers["x-space-id"] as string | undefined;
        if (requestedSpace && requestedSpace !== session.user.id) {
          // Validate membership
          const [membership] = await db
            .select()
            .from(spaceMembers)
            .where(and(eq(spaceMembers.spaceOwnerId, requestedSpace), eq(spaceMembers.memberAuthId, session.user.id)));
          spaceOwnerId = membership ? requestedSpace : session.user.id;
        } else {
          spaceOwnerId = session.user.id;
        }
      }

      return { session, spaceOwnerId };
    },
  }),
);

// In production, serve the built Vite SPA
if (isProd) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../../client/dist");

  app.use(express.static(clientDist));

  // Catch-all: return index.html for client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/graphql`);
  startWorkHistoryCron();
});
