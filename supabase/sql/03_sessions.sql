-- Phase 1: Core campaign management
-- Sessions (per campaign)

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null default 'Session',
  status text not null default 'active' check (status in ('active', 'completed')),
  phase text not null default 'prep' check (phase in ('prep', 'exploration', 'roleplay', 'combat')),
  started_at timestamptz,
  ended_at timestamptz,
  token_budget_used integer not null default 0 check (token_budget_used >= 0),
  summary_json jsonb,
  notes_md text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_campaign_id_idx
  on public.sessions (campaign_id);

create index if not exists sessions_created_at_idx
  on public.sessions (created_at);

create index if not exists sessions_status_idx
  on public.sessions (status);

create index if not exists sessions_started_at_idx
  on public.sessions (started_at);
