-- Phase 1: Future-ready stubs for Phase 2+
-- Minimal schemas only; no AI triggers or background processing.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,
  occurred_at timestamptz,
  type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_campaign_id_idx on public.events (campaign_id);
create index if not exists events_session_id_idx on public.events (session_id);
create index if not exists events_created_at_idx on public.events (created_at);


create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  seq integer not null,
  started_at timestamptz,
  ended_at timestamptz,
  speaker text,
  content text not null default '',
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

create index if not exists transcript_segments_campaign_id_idx on public.transcript_segments (campaign_id);
create index if not exists transcript_segments_session_id_idx on public.transcript_segments (session_id);
create index if not exists transcript_segments_created_at_idx on public.transcript_segments (created_at);


create table if not exists public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  source text,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memory_chunks_campaign_id_idx on public.memory_chunks (campaign_id);
create index if not exists memory_chunks_created_at_idx on public.memory_chunks (created_at);


create table if not exists public.rules_chunks (
  id uuid primary key default gen_random_uuid(),
  -- Optional campaign scoping for overrides/custom rules.
  campaign_id uuid references public.campaigns (id) on delete cascade,
  system text not null default 'd&d5e',
  source text not null default 'srd5.1',
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rules_chunks_campaign_id_idx on public.rules_chunks (campaign_id);
create index if not exists rules_chunks_system_source_idx on public.rules_chunks (system, source);
create index if not exists rules_chunks_created_at_idx on public.rules_chunks (created_at);


create table if not exists public.proper_nouns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  kind text,
  aliases text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (campaign_id, name)
);

create index if not exists proper_nouns_campaign_id_idx on public.proper_nouns (campaign_id);
create index if not exists proper_nouns_created_at_idx on public.proper_nouns (created_at);


create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  subject text not null,
  object text not null,
  relationship_type text,
  score numeric(6, 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists relationships_campaign_id_idx on public.relationships (campaign_id);
create index if not exists relationships_created_at_idx on public.relationships (created_at);


create table if not exists public.handouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null,
  kind text,
  url text,
  content_md text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists handouts_campaign_id_idx on public.handouts (campaign_id);
create index if not exists handouts_created_at_idx on public.handouts (created_at);


create table if not exists public.npc_agents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  enabled boolean not null default true,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists npc_agents_campaign_id_idx on public.npc_agents (campaign_id);
create index if not exists npc_agents_character_id_idx on public.npc_agents (character_id);
create index if not exists npc_agents_created_at_idx on public.npc_agents (created_at);
