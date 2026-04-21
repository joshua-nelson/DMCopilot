# DM Copilot

DM Copilot is a D&D 5e campaign assistant for running sessions, looking up rules, and capturing session outcomes. It combines Clerk auth, Supabase-backed campaign data, and OpenRouter-powered AI features.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Required environment variables

See `.env.example` for the full list. The main local dev values are:

- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default: `google/gemma-4-31b-it:free`)

## SRD ingest

SRD 5.1 content is downloaded at runtime into `scripts/ingest-srd/.cache/`, which is gitignored.

Run the ingest pipeline in order:

```bash
node scripts/ingest-srd/download.mjs
node scripts/ingest-srd/parse.mjs
node scripts/ingest-srd/seed.mjs
```

Apply the search SQL:

```bash
psql "$DATABASE_URL" -f supabase/sql/10_rules_chunks_search.sql
```

Replace `$DATABASE_URL` with your Supabase Postgres connection string.

## Using the app

- Open the Rules Lookup modal with `Ctrl+K` / `Cmd+K`.
- Use it to search SRD excerpts or ask the AI for a rules answer.
- On session pages, generate a post-session summary from session notes, then edit the generated JSON if needed.
- Session routes also show a persistent status strip for player and combat state.
