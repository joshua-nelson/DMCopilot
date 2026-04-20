# Supabase provisioning (Postgres)

Phase 0 only: create projects and wire env vars. Do **not** enable extensions/migrations here.

## Create projects

Create two Supabase projects:

- `dmcopilot-dev`
- `dmcopilot-prod`

Pick a region close to your Vercel deployment region.

## Get API keys

For each project:

1. Supabase → **Project Settings → API**
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## Phase 1 note (do later)

Phase 1 will enable Postgres extensions:

- `pgvector`
- `pg_trgm`

Do not enable them in Phase 0 unless a migration requires it.
