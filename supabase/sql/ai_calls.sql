-- Phase 0 WP4: AI cost tracking
--
-- This table is intended for server-side inserts via the Supabase service role.
-- Enable RLS with no policies so only service role can read/write by default.

create extension if not exists "pgcrypto";

create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  feature text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_hit boolean not null default false,
  cost_usd numeric(10, 6) not null default 0,
  latency_ms integer,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.ai_calls enable row level security;

create index if not exists ai_calls_created_at_idx on public.ai_calls (created_at desc);
create index if not exists ai_calls_clerk_user_id_created_at_idx on public.ai_calls (clerk_user_id, created_at desc);
create index if not exists ai_calls_model_created_at_idx on public.ai_calls (model, created_at desc);
create index if not exists ai_calls_feature_created_at_idx on public.ai_calls (feature, created_at desc);
