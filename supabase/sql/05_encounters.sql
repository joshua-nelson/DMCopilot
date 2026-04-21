-- Phase 1: Core campaign management
-- Encounters (combat state tracking)

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,

  status text not null default 'active' check (status in ('active', 'completed')),

  -- JSON array of participants in initiative order
  -- Example element shape (app-managed): {"character_id": "...", "name": "...", "initiative": 14, ...}
  participants jsonb not null default '[]'::jsonb,
  round integer not null default 1 check (round >= 1),
  active_turn_idx integer not null default 0 check (active_turn_idx >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists encounters_campaign_id_idx
  on public.encounters (campaign_id);

create index if not exists encounters_session_id_idx
  on public.encounters (session_id);

create index if not exists encounters_status_idx
  on public.encounters (status);

create index if not exists encounters_created_at_idx
  on public.encounters (created_at);
