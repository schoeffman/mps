# MPS

MPS Project Scheduler is a project scheduler for managing team capacity across quarterly schedules. It shows who is working on what each week in an interactive grid view.

## Prerequisites

- **macOS** (tested on macOS 13+)
- **Node.js** v18 or later — install from [nodejs.org](https://nodejs.org/) or via Homebrew:
  ```
  brew install node
  ```
- **Xcode Command Line Tools** — required to compile the native SQLite dependency. Install with:
  ```
  xcode-select --install
  ```

## Getting started

1. **Clone the repository and install dependencies:**

   ```
   git clone <repo-url>
   cd mps
   npm install
   ```

2. **Create the database:**

   ```
   npm run db:push -w server
   ```

3. **Seed the database with sample data:**

   ```
   npm run db:seed -w server
   ```

4. **Start the development servers:**

   ```
   npm run dev
   ```

   This starts both the client and server concurrently:
   - Client (Vite): [http://localhost:5173](http://localhost:5173)
   - Server (GraphQL): [http://localhost:4000/graphql](http://localhost:4000/graphql)

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project structure

```
mps/
├── client/          React + Vite frontend
│   └── src/
│       ├── components/   UI components
│       ├── routes/       Page routes
│       └── lib/          Utility functions
├── server/          Express + Apollo Server backend
│   └── src/
│       ├── db/           Drizzle ORM schema, seed data, SQLite database
│       └── schema.ts     GraphQL type definitions and resolvers
└── package.json     Workspace root (npm workspaces)
```

## Available scripts

From the project root:

| Command | Description |
|---|---|
| `npm run dev` | Start both client and server in watch mode |
| `npm run dev -w client` | Start only the Vite dev server |
| `npm run dev -w server` | Start only the API server |
| `npm run db:push -w server` | Push schema changes to the SQLite database |
| `npm run db:seed -w server` | Seed the database with sample data |
| `npm run db:studio -w server` | Open Drizzle Studio to browse the database |

## Tech stack

- **Frontend:** React, React Router, Apollo Client, Tailwind CSS, Radix UI
- **Backend:** Express, Apollo Server, GraphQL
- **Database:** SQLite via better-sqlite3, Drizzle ORM
