-- Phase 1: Core campaign management
-- Characters (PCs, NPCs, monsters)

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,

  name text not null,
  type text not null default 'pc' check (type in ('pc', 'npc', 'monster')),
  is_npc boolean not null default false,
  player_name text,

  class text,
  race text,
  level integer not null default 1 check (level >= 1),

  str integer not null default 10,
  dex integer not null default 10,
  con integer not null default 10,
  int integer not null default 10,
  wis integer not null default 10,
  cha integer not null default 10,

  hp_current integer,
  hp_max integer,
  ac integer,
  initiative_bonus integer not null default 0,
  speed integer,

  saves jsonb not null default '{}'::jsonb,
  skills jsonb not null default '{}'::jsonb,
  features jsonb not null default '[]'::jsonb,
  spell_slots jsonb not null default '{}'::jsonb,

  conditions text[] not null default '{}'::text[],

  portrait_url text,
  speaker_color text,
  voice_id text,

  aliases text[] not null default '{}'::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_campaign_id_idx
  on public.characters (campaign_id);

create index if not exists characters_created_at_idx
  on public.characters (created_at);

-- Fuzzy matching for name lookups (pg_trgm)
create index if not exists characters_name_trgm_idx
  on public.characters using gin (name gin_trgm_ops);

create index if not exists characters_aliases_gin_idx
  on public.characters using gin (aliases);
