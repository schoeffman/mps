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

## Features

- **Users** — manage people with craft ability, job level, and focus area
- **Teams** — group users with a team lead
- **Projects** — track projects with DRI, status, target date, and color coding
- **Schedules** — quarterly schedule grids showing weekly user/project assignments
- **Work History** — daily snapshots of schedule assignments with a date picker for browsing past records (cron job runs at 11 PM daily)
- **Auth** — Google (and Apple) social login via Better Auth with per-user data isolation

## Tech stack

- **Frontend:** React 19, React Router, Apollo Client, Tailwind CSS v4, shadcn/ui, Radix UI
- **Backend:** Express 4, Apollo Server, GraphQL, node-cron
- **Database:** PostgreSQL, Drizzle ORM
- **Auth:** Better Auth with Drizzle adapter
- **Deployment:** Railway (Nixpacks)
