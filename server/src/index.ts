import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { typeDefs, resolvers } from "./schema.js";

const app = express();
const server = new ApolloServer({ typeDefs, resolvers });

await server.start();

app.use(
  "/graphql",
  cors({ origin: "http://localhost:5173" }),
  express.json(),
  expressMiddleware(server),
);

app.listen(4000, () => {
  console.log("Server running at http://localhost:4000/graphql");
});
