# MPS

MPS (Project Scheduler) is a web app for managing team capacity across quarterly schedules. It shows who is working on what each week in an interactive grid view and keeps a daily work history audit trail.

## Prerequisites

- **Node.js** v22 or later
- **PostgreSQL** — local instance with a database named `mps`, or a remote connection string
- **Google OAuth credentials** — for social login (Apple is optional)

## Getting started

1. **Clone and install dependencies:**

   ```
   git clone <repo-url>
   cd mps
   npm install
   ```

2. **Configure environment variables:**

   ```
   cp server/.env.example server/.env
   ```

   Edit `server/.env` and fill in your values:

   | Variable | Description |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection string (default: `postgresql://localhost:5432/mps`) |
   | `BETTER_AUTH_SECRET` | Random 32+ character string for session signing |
   | `BETTER_AUTH_URL` | Server base URL (default: `http://localhost:4000`) |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `APPLE_CLIENT_ID` | Apple OAuth client ID (optional) |
   | `APPLE_CLIENT_SECRET` | Apple OAuth client secret (optional) |
   | `CORS_ORIGIN` | Allowed client origin (default: `http://localhost:5173`) |
   | `TRUSTED_ORIGINS` | Comma-separated trusted origins for auth (default: `http://localhost:5173`) |

3. **Push the database schema:**

   ```
   npm run db:push -w server
   ```

4. **Start the development servers:**

   ```
   npm run dev
   ```

   This starts both the client and server concurrently:
   - Client (Vite): [http://localhost:5173](http://localhost:5173)
   - Server (GraphQL): [http://localhost:4000/graphql](http://localhost:4000/graphql)

5. **Sign in** via Google. Demo data (users, teams, projects, schedules, and work history) is automatically seeded on first login.

## Project structure

```
mps/
├── client/              React + Vite frontend
│   └── src/
│       ├── components/    UI components (shadcn/ui)
│       ├── routes/        Page routes
│       └── lib/           Apollo client, auth client, utilities
├── server/              Express + Apollo Server backend
│   └── src/
│       ├── db/            Drizzle schema, migrations, seed data
│       ├── jobs/          Cron jobs (work history snapshots)
│       ├── auth.ts        Better Auth configuration
│       ├── schema.ts      GraphQL type definitions and resolvers
│       └── index.ts       Server entry point
├── railway.json         Railway deployment config
└── package.json         Workspace root (npm workspaces)
```

## Available scripts

From the project root:

| Command | Description |
|---|---|
| `npm run dev` | Start both client and server in watch mode |
| `npm run dev -w client` | Start only the Vite dev server |
| `npm run dev -w server` | Start only the API server |
| `npm run build` | Build the client for production |
| `npm start` | Start the production server (serves built client) |
| `npm run db:push -w server` | Push schema changes to the database |
| `npm run db:seed -w server` | Seed the database (requires `OWNER_ID` env var) |
| `npm run db:reseed -w server` | Clear and reseed using the first auth user in the database |
| `npm run db:studio -w server` | Open Drizzle Studio to browse the database |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Testing

Tests use [Vitest](https://vitest.dev/) and run from the project root across both workspaces.

```bash
npm test            # single run
npm run test:watch  # watch mode
```

Tests focus on pure utility functions extracted from resolvers:

- `client/src/lib/schedule-utils.test.ts` — quarter ranges, week generation, holiday detection, formatting
- `client/src/lib/gantt-scheduler.test.ts` — Gantt chart issue scheduling algorithm
- `server/src/lib/merge-week-ranges.test.ts` — merging consecutive weekly assignments into date ranges
- `server/src/lib/generate-date-range.test.ts` — inclusive date range generation

No database or network connection is required to run tests.

## Features

- **Dashboard** — landing page showing on-call assignments (this week and next), leave/vacation overview (with US holidays), and projects scheduled this week with Atlassian project status
- **Users** — manage people with craft ability, job level, and focus area
- **Teams** — group users with a team lead
- **Projects** — track projects with DRI, status, target date, and color coding
- **Schedules** — quarterly schedule grids showing weekly user/project assignments with column and row bulk assignment, paint mode, and auto-scroll to the current week
- **Work History** — daily snapshots of schedule assignments with a date picker for browsing past records (cron job runs at 11 PM daily)
- **Jira Integration** — link projects to Jira Cloud to view issues (key, summary, status, assignee) directly on the project detail page
- **Atlassian Projects Integration** — link projects to Atlassian Projects to view status, latest update, and due date on the dashboard and project detail page
- **Auth** — Google (and Apple) social login via Better Auth with per-user data isolation

## Jira Integration

You can optionally connect a Jira Cloud instance to view issues on project pages.

### Setup

1. **Generate a Jira API token:**
   - Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click **Create API token**, give it a label, and copy the generated token

2. **Configure in MPS:**
   - Open **Settings** in the app
   - In the **Jira Integration** section, enter your Jira domain (e.g. `mycompany` for `mycompany.atlassian.net`), the email associated with your Jira account, and the API token
   - Click **Save Jira Config**

3. **Link a project:**
   - Edit any project and enter its **Jira Project Key** (e.g. `MPS`, `INFRA`)
   - The project detail page will display a **Jira Issues** table with links back to Jira

### Schema migration

If upgrading an existing database, run:

```sql
CREATE TABLE jira_config (
  id SERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES "user"(id),
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  api_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
ALTER TABLE projects ADD COLUMN jira_project_key TEXT;
```

## Tech stack

- **Frontend:** React 19, React Router, Apollo Client, Tailwind CSS v4, shadcn/ui, Radix UI
- **Backend:** Express 4, Apollo Server, GraphQL, node-cron
- **Database:** PostgreSQL, Drizzle ORM
- **Auth:** Better Auth with Drizzle adapter
- **Deployment:** Railway (Nixpacks)
