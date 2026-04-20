-- Phase 0 WP3: minimal user profile storage.
-- Run this in the Supabase SQL editor.

create table if not exists public.user_profiles (
  clerk_user_id text primary key,
  display_name text not null,
  role text not null default 'dm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_role_idx
  on public.user_profiles (role);

create index if not exists user_profiles_created_at_idx
  on public.user_profiles (created_at);
