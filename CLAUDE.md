# MPS — MPS Planning System

## Quick Start

```bash
npm install          # install all workspaces
npm run dev          # starts both client (Vite :5173) and server (Express :4000)
```

Requires Node >= 22 and a local PostgreSQL database named `mps` at `postgresql://localhost:5432/mps`.

## Project Structure

Monorepo with two workspaces:

```
client/              React 19 + Vite + TailwindCSS v4 + shadcn/ui + Apollo Client
server/              Express 4 + Apollo Server (GraphQL) + Drizzle ORM + node-postgres
```

## Tech Stack

- **Server**: Express 4, Apollo Server, Drizzle ORM, node-postgres (pg), Better Auth
- **Client**: React 19, Vite, TailwindCSS v4, shadcn/ui, Apollo Client, React Router
- **Auth**: Better Auth with Google OAuth (Apple planned). Session-based, not JWT.
- **DB**: PostgreSQL — local in dev, Railway-managed in production

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Start client + server concurrently |
| `npm run dev -w client` | Start client only |
| `npm run dev -w server` | Start server only (tsx watch, auto-reloads) |
| `npm run build` | Build client for production |
| `npm start` | Production start (serves built client from Express) |
| `npm run db:push -w server` | Push Drizzle schema to DB (may hang on prompts — use psql instead) |
| `npm run db:studio -w server` | Open Drizzle Studio |
| `npm test` | Run all tests (Vitest, both workspaces) |
| `npm run test:watch` | Run tests in watch mode |

## Architecture

### Data Model

All app data is scoped by `ownerId` (= the auth user's ID). Every table that holds user-created data has an `ownerId` column. The `getOwnerId(context)` helper in `server/src/schema.ts` is called by every resolver to scope queries.

### Spaces (Multi-User Sharing)

A "space" IS an ownerId. The `space_members` table grants a user access to another user's data. The server reads an `x-space-id` HTTP header from the client, validates membership, and sets `context.spaceOwnerId`. The `getOwnerId()` function returns this value, so all 40+ existing resolvers work without changes.

On the client, `SpaceProvider` (wraps all authenticated routes) queries available spaces, tracks the active space in React state + localStorage, and the Apollo Link chain injects the `x-space-id` header on every request. The `SpaceSwitcher` dropdown lives in the main content header next to the sidebar trigger.

### Auth Flow

- Better Auth manages `user`, `session`, `account`, `verification` tables
- App `users` table is separate, linked via optional `auth_user_id` FK
- Server: session extracted in Apollo context function, `requireAuth()` guard on mutations
- Client: `ProtectedRoute` redirects to `/login` if no session

### Jira Integration

Optional per-owner Jira Cloud integration. Credentials stored in `jira_config` table (domain, email, API token). Projects can have a nullable `jira_project_key` column. The server proxies all Jira API calls (`server/src/lib/jira-client.ts`) so credentials never reach the client. Settings page has a "Jira Integration" section (owner-only) for managing config. Edit project dialog shows a "Jira Project Key" field when config exists. Project detail page shows a "Jira Issues" table when a project has a linked key.

### GraphQL

Single schema in `server/src/schema.ts` — types, resolvers, and helpers all in one file. No code generation. The client uses raw `gql` template strings with Apollo's `useQuery`/`useMutation`.

## Testing

Vitest runs from the project root across both workspaces (`npm test`). Tests target pure utility functions — no DB or network required.

- `client/src/lib/schedule-utils.test.ts` — quarter ranges, week generation, holiday detection, formatting
- `server/src/lib/merge-week-ranges.test.ts` — merging consecutive weekly assignments into date ranges
- `server/src/lib/generate-date-range.test.ts` — inclusive date range generation

Server has a minimal `server/vitest.config.ts` for NodeNext module resolution. The client needs no extra config.

When adding new logic-heavy utilities, extract them as pure functions in `*/src/lib/` and add a corresponding `.test.ts` file.

## Important Patterns

- **Server has no build step** — uses `tsx watch` in dev, `node --import tsx` in production
- **Pre-existing tsc errors in server**: Express types mismatch (apollo/express version conflict) and graphql-tag default import. These don't affect runtime. Client compiles clean.
- **Express 4** — uses `app.all("/api/auth/*", handler)` not `/*splat` (that's Express 5 syntax)
- **Drizzle schema** in `server/src/db/schema.ts`, DB connection in `server/src/db/index.ts`
- **Client path alias**: `@/` maps to `./src/*`
- **Enum mapping**: GraphQL enums like `ProductManagement` map to DB strings like `"Product Management"` via lookup objects (`craftAbilityToDb`/`craftAbilityFromDb`, `projectTypeToDb`/`projectTypeFromDb`, etc.)
- **drizzle-kit push can hang** on interactive prompts. For schema changes, prefer running ALTER TABLE directly via psql: `/opt/homebrew/opt/postgresql@17/bin/psql postgresql://localhost:5432/mps`

## Environment Variables (server/.env)

```
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=http://localhost:4000        # production: your deployed URL
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
APPLE_CLIENT_ID=                             # not yet configured
APPLE_CLIENT_SECRET=
DATABASE_URL=postgresql://localhost:5432/mps  # optional, defaults to this
```

## Production (Railway)

- Server + DB hosted on Railway
- `npm start` runs the production server which serves the built client SPA
- Schema changes require manual `ALTER TABLE` on Railway's DB or `drizzle-kit push` with the production `DATABASE_URL`
- `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` must be set to the production domain
- Google OAuth redirect URI in Google Console must include `https://<domain>/api/auth/callback/google`
