# AI Planner

A productivity web app that turns natural-language instructions into a structured daily plan, assisted by an AI agent.

The user writes a goal in plain language (e.g. "I have a meeting at 9 tomorrow, leave time for the gym"). The AI agent drafts a plan (tasks + schedule). The user reviews, edits, and approves. Approved plans become real tasks managed from a dashboard, task list, and weekly calendar.

## Features

- **Natural Language Planning** — create a plan without entering tasks one by one.
- **AI-Assisted Scheduling** — the AI arranges activities based on duration, availability, priority, and existing schedule.
- **Actionable AI Agent** — AI output is reviewable, approvable, and persisted as real tasks.
- **Recurring routines** — phrases like "every day" expand into a multi-day plan.
- **Live task status** — task state (`Not started` / `In progress` / `Done`) derives automatically from the schedule clock.
- **Centralized Task Management** — manage schedule, status, priority, and progress from one dashboard.
- **Per-user data isolation** — Row Level Security (RLS) on Supabase.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React, Vite, Tailwind CSS, React Router, Lucide React |
| Backend | Node.js, Express, Zod |
| AI | LLM API (structured output + tool calling), accessed only through the backend |
| Database | Supabase PostgreSQL (Auth + RLS) |

## Architecture

```
Browser (React SPA)
   │  REST (JWT bearer)
   ▼
Express API (backend/)
   │  service-role client (server-only)
   ▼
Supabase (Postgres + RLS + Auth)
   ▲
   │  LLM API (tool calling: get_tasks)
Express API ──────────── AI model
```

Key security property: the LLM never touches the database directly. It calls backend tools (`get_tasks`), which are validated and scoped to the authenticated user.

## Project Structure

```
backend/   — Express API: auth, task CRUD, AI agent, schedule validation
frontend/  — React SPA: dashboard, AI planner, tasks, calendar, history
supabase/  — database schema + RLS policies
```

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (database + auth)

### 1. Database

Create a Supabase project, then run `supabase/schema.sql` in the SQL editor. Note the project URL and keys.

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in environment variables
npm install
npm run dev            # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # fill in environment variables
npm install
npm run dev            # http://localhost:5173
```

## Environment Variables

See `.env.example` in `backend/` and `frontend/`.

## License

MIT
