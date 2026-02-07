import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { typeDefs, resolvers, type Context } from "./schema.js";
import { auth } from "./auth.js";

const app = express();

// Mount Better Auth handler before express.json (it parses its own body)
app.all("/api/auth/*", toNodeHandler(auth));

const server = new ApolloServer<Context>({ typeDefs, resolvers });
await server.start();

app.use(
  "/graphql",
  cors({ origin: "http://localhost:5173", credentials: true }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      return { session };
    },
  }),
);

app.listen(4000, () => {
  console.log("Server running at http://localhost:4000/graphql");
});
