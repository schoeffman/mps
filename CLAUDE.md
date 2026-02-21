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
| `npm run db:generate -w server` | Generate a new migration file from schema changes |
| `npm run db:migrate -w server` | Apply pending migrations to the DB |
| `npm run db:mark-baseline -w server` | One-time: mark the baseline migration as applied on an existing DB |
| `npm run db:push -w server` | Directly sync schema to DB without migration files (dev shortcut only) |
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

### Dashboard

The landing page (`/`) shows an at-a-glance overview:

- **On Call This Week / Next Week** — users assigned to the "On Call" system project
- **On Leave This Week / Upcoming Leave** — users assigned to "Leave (Standard)" or "Leave (Extended)" system projects, plus US holidays (shown as "US Teams")
- **Projects Scheduled This Week** — non-system projects with assignments for the current week, linked to project detail pages. For projects with an Atlassian integration, shows update age (color-coded: normal < 7 days, yellow 6-7 days, red > 7 days unless Complete), Atlassian status, and due date.

Atlassian data is fetched in a separate GraphQL query (`projectAtlassianStatuses`) so it doesn't block the main dashboard load.

### Jira / Atlassian Integration

Optional per-owner Jira Cloud and Atlassian Projects integration. Credentials stored in `jira_config` table (domain, email, API token). Projects can have nullable `jira_project_key` and `atlassian_project_key` columns. The server proxies all API calls (`server/src/lib/jira-client.ts`, `server/src/lib/atlassian-projects-client.ts`) so credentials never reach the client. Settings page has a "Jira Integration" section (owner-only) for managing config. Edit project dialog shows key fields when config exists. Project detail page shows Jira Issues and Atlassian Project data when linked.

### GraphQL

Single schema in `server/src/schema.ts` — types, resolvers, and helpers all in one file. No code generation. The client uses raw `gql` template strings with Apollo's `useQuery`/`useMutation`.

## Testing

Vitest runs from the project root across both workspaces (`npm test`). Tests target pure utility functions — no DB or network required.

- `client/src/lib/schedule-utils.test.ts` — quarter ranges, week generation, holiday detection, formatting
- `client/src/lib/gantt-scheduler.test.ts` — Gantt chart issue scheduling algorithm
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

## Database Migrations

Migration files live in `server/drizzle/`. Always commit them alongside schema changes.

**Making a schema change:**
```bash
# 1. Edit server/src/db/schema.ts
# 2. Generate the migration file
npm run db:generate -w server
# 3. Apply it locally
npm run db:migrate -w server
# 4. Commit both the schema change and the new file in server/drizzle/
```

**Applying migrations in production (Railway):**
```bash
DATABASE_URL=<railway-url> npm run db:migrate -w server
```

**First-time setup on an existing database** (run once — marks the baseline as already applied without re-running it):
```bash
# Local
npm run db:mark-baseline -w server
# Railway
DATABASE_URL=<railway-url> npm run db:mark-baseline -w server
```

> Do not use `db:push` for production — it syncs the schema directly with no migration file and no history.

## Production (Railway)

- Server + DB hosted on Railway
- `npm start` runs the production server which serves the built client SPA
- Schema changes: generate a migration file locally, commit it, then run `db:migrate` against the Railway DB
- `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` must be set to the production domain
- Google OAuth redirect URI in Google Console must include `https://<domain>/api/auth/callback/google`
