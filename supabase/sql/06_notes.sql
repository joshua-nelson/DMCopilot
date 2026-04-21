-- Phase 1: Core campaign management
-- Notes (markdown, pinnable)

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,

  title text,
  content_md text not null default '',
  pinned boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_campaign_id_idx
  on public.notes (campaign_id);

create index if not exists notes_session_id_idx
  on public.notes (session_id);

create index if not exists notes_pinned_idx
  on public.notes (pinned);

create index if not exists notes_created_at_idx
  on public.notes (created_at);
