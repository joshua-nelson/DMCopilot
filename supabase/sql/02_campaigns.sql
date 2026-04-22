-- Phase 1: Core campaign management
-- Campaigns (DM-owned)

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dm_user_id text not null references public.user_profiles (clerk_user_id) on delete restrict,
  name text not null,
  system text not null default 'd&d5e',
  tone text not null default 'heroic',
  description text,
  is_archived boolean not null default false,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_dm_user_id_idx
  on public.campaigns (dm_user_id);

create index if not exists campaigns_created_at_idx
  on public.campaigns (created_at);
