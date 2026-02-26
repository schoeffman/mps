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

// Mobile OAuth start — browser-side initiation so Better Auth's state cookie
// lands in the correct cookie jar (ASWebAuthenticationSession's ephemeral store)
app.get("/auth/mobile-start", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
(async () => {
  try {
    const r = await fetch('/api/auth/sign-in/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', callbackURL: 'https://mps-p.up.railway.app/auth/mobile-callback' })
    });
    const d = await r.json();
    if (d.url) { window.location.href = d.url; }
    else { window.location.href = 'mps-ios://auth/callback?error=no_url'; }
  } catch (e) {
    window.location.href = 'mps-ios://auth/callback?error=init_failed';
  }
})();
</script></body></html>`);
});

// Mobile OAuth relay — fetches the Better Auth session and deep-links into iOS app
app.get("/auth/mobile-callback", async (req, res) => {
  // Primary: use Better Auth's getSession (reads the session cookie)
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    const token = session?.session?.token;
    if (token) {
      res.redirect(`mps-ios://auth/callback?token=${encodeURIComponent(token)}`);
      return;
    }
  } catch (err) {
    console.error("mobile-callback getSession error:", err);
  }

  // Fallback: read the raw Better Auth session cookie directly
  const cookieStr = req.headers.cookie ?? "";
  const cookies = Object.fromEntries(
    cookieStr.split(";").flatMap((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return [];
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      return key ? [[key, decodeURIComponent(val)]] : [];
    }),
  );
  const rawToken = cookies["better-auth.session_token"];
  if (rawToken) {
    res.redirect(`mps-ios://auth/callback?token=${encodeURIComponent(rawToken)}`);
    return;
  }

  console.warn("mobile-callback: no session found, cookies:", Object.keys(cookies));
  res.redirect("mps-ios://auth/callback?error=no_session");
});

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
