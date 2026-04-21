-- Phase 1: Row Level Security policies
--
-- Requirement: users can only access campaigns they own and related data.
--
-- NOTE: Phase 0 user_profiles is keyed by clerk_user_id (text). To use auth.uid()
-- in RLS, we add an optional auth_user_id UUID mapping column.

alter table public.user_profiles
  add column if not exists auth_user_id uuid;

create unique index if not exists user_profiles_auth_user_id_uidx
  on public.user_profiles (auth_user_id)
  where auth_user_id is not null;

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.clerk_user_id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_campaign_owner(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.id = p_campaign_id
      and c.dm_user_id = public.current_clerk_user_id()
  )
$$;


-- campaigns
alter table public.campaigns enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'campaigns_select_own'
  ) then
    create policy campaigns_select_own on public.campaigns
      for select to authenticated
      using (dm_user_id = public.current_clerk_user_id());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'campaigns_insert_own'
  ) then
    create policy campaigns_insert_own on public.campaigns
      for insert to authenticated
      with check (dm_user_id = public.current_clerk_user_id());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'campaigns_update_own'
  ) then
    create policy campaigns_update_own on public.campaigns
      for update to authenticated
      using (dm_user_id = public.current_clerk_user_id())
      with check (dm_user_id = public.current_clerk_user_id());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'campaigns_delete_own'
  ) then
    create policy campaigns_delete_own on public.campaigns
      for delete to authenticated
      using (dm_user_id = public.current_clerk_user_id());
  end if;
end $$;


-- sessions
alter table public.sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_select_own'
  ) then
    create policy sessions_select_own on public.sessions
      for select to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_insert_own'
  ) then
    create policy sessions_insert_own on public.sessions
      for insert to authenticated
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_update_own'
  ) then
    create policy sessions_update_own on public.sessions
      for update to authenticated
      using (public.is_campaign_owner(campaign_id))
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_delete_own'
  ) then
    create policy sessions_delete_own on public.sessions
      for delete to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;
end $$;


-- characters
alter table public.characters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'characters' and policyname = 'characters_select_own'
  ) then
    create policy characters_select_own on public.characters
      for select to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'characters' and policyname = 'characters_insert_own'
  ) then
    create policy characters_insert_own on public.characters
      for insert to authenticated
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'characters' and policyname = 'characters_update_own'
  ) then
    create policy characters_update_own on public.characters
      for update to authenticated
      using (public.is_campaign_owner(campaign_id))
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'characters' and policyname = 'characters_delete_own'
  ) then
    create policy characters_delete_own on public.characters
      for delete to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;
end $$;


-- encounters
alter table public.encounters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'encounters' and policyname = 'encounters_select_own'
  ) then
    create policy encounters_select_own on public.encounters
      for select to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'encounters' and policyname = 'encounters_insert_own'
  ) then
    create policy encounters_insert_own on public.encounters
      for insert to authenticated
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'encounters' and policyname = 'encounters_update_own'
  ) then
    create policy encounters_update_own on public.encounters
      for update to authenticated
      using (public.is_campaign_owner(campaign_id))
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'encounters' and policyname = 'encounters_delete_own'
  ) then
    create policy encounters_delete_own on public.encounters
      for delete to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;
end $$;


-- notes
alter table public.notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notes' and policyname = 'notes_select_own'
  ) then
    create policy notes_select_own on public.notes
      for select to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notes' and policyname = 'notes_insert_own'
  ) then
    create policy notes_insert_own on public.notes
      for insert to authenticated
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notes' and policyname = 'notes_update_own'
  ) then
    create policy notes_update_own on public.notes
      for update to authenticated
      using (public.is_campaign_owner(campaign_id))
      with check (public.is_campaign_owner(campaign_id));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notes' and policyname = 'notes_delete_own'
  ) then
    create policy notes_delete_own on public.notes
      for delete to authenticated
      using (public.is_campaign_owner(campaign_id));
  end if;
end $$;


-- Phase 2+ stub tables (campaign-scoped)

alter table public.events enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.memory_chunks enable row level security;
alter table public.rules_chunks enable row level security;
alter table public.proper_nouns enable row level security;
alter table public.relationships enable row level security;
alter table public.handouts enable row level security;
alter table public.npc_agents enable row level security;

do $$
begin
  -- events
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_select_own') then
    create policy events_select_own on public.events for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_insert_own') then
    create policy events_insert_own on public.events for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_update_own') then
    create policy events_update_own on public.events for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_delete_own') then
    create policy events_delete_own on public.events for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;

  -- transcript_segments
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transcript_segments' and policyname='transcript_segments_select_own') then
    create policy transcript_segments_select_own on public.transcript_segments for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transcript_segments' and policyname='transcript_segments_insert_own') then
    create policy transcript_segments_insert_own on public.transcript_segments for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transcript_segments' and policyname='transcript_segments_update_own') then
    create policy transcript_segments_update_own on public.transcript_segments for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transcript_segments' and policyname='transcript_segments_delete_own') then
    create policy transcript_segments_delete_own on public.transcript_segments for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;

  -- memory_chunks
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memory_chunks' and policyname='memory_chunks_select_own') then
    create policy memory_chunks_select_own on public.memory_chunks for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memory_chunks' and policyname='memory_chunks_insert_own') then
    create policy memory_chunks_insert_own on public.memory_chunks for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memory_chunks' and policyname='memory_chunks_update_own') then
    create policy memory_chunks_update_own on public.memory_chunks for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memory_chunks' and policyname='memory_chunks_delete_own') then
    create policy memory_chunks_delete_own on public.memory_chunks for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;

  -- rules_chunks (allow read of global rules where campaign_id is null)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rules_chunks' and policyname='rules_chunks_select_global_or_own') then
    create policy rules_chunks_select_global_or_own on public.rules_chunks
      for select to authenticated
      using (campaign_id is null or public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rules_chunks' and policyname='rules_chunks_insert_own') then
    create policy rules_chunks_insert_own on public.rules_chunks
      for insert to authenticated
      with check (campaign_id is not null and public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rules_chunks' and policyname='rules_chunks_update_own') then
    create policy rules_chunks_update_own on public.rules_chunks
      for update to authenticated
      using (campaign_id is not null and public.is_campaign_owner(campaign_id))
      with check (campaign_id is not null and public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rules_chunks' and policyname='rules_chunks_delete_own') then
    create policy rules_chunks_delete_own on public.rules_chunks
      for delete to authenticated
      using (campaign_id is not null and public.is_campaign_owner(campaign_id));
  end if;

  -- proper_nouns
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='proper_nouns' and policyname='proper_nouns_select_own') then
    create policy proper_nouns_select_own on public.proper_nouns for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='proper_nouns' and policyname='proper_nouns_insert_own') then
    create policy proper_nouns_insert_own on public.proper_nouns for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='proper_nouns' and policyname='proper_nouns_update_own') then
    create policy proper_nouns_update_own on public.proper_nouns for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='proper_nouns' and policyname='proper_nouns_delete_own') then
    create policy proper_nouns_delete_own on public.proper_nouns for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;

  -- relationships
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationships' and policyname='relationships_select_own') then
    create policy relationships_select_own on public.relationships for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationships' and policyname='relationships_insert_own') then
    create policy relationships_insert_own on public.relationships for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationships' and policyname='relationships_update_own') then
    create policy relationships_update_own on public.relationships for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='relationships' and policyname='relationships_delete_own') then
    create policy relationships_delete_own on public.relationships for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;

  -- handouts
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='handouts' and policyname='handouts_select_own') then
    create policy handouts_select_own on public.handouts for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='handouts' and policyname='handouts_insert_own') then
    create policy handouts_insert_own on public.handouts for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='handouts' and policyname='handouts_update_own') then
    create policy handouts_update_own on public.handouts for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='handouts' and policyname='handouts_delete_own') then
    create policy handouts_delete_own on public.handouts for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;

  -- npc_agents
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='npc_agents' and policyname='npc_agents_select_own') then
    create policy npc_agents_select_own on public.npc_agents for select to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='npc_agents' and policyname='npc_agents_insert_own') then
    create policy npc_agents_insert_own on public.npc_agents for insert to authenticated with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='npc_agents' and policyname='npc_agents_update_own') then
    create policy npc_agents_update_own on public.npc_agents for update to authenticated using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='npc_agents' and policyname='npc_agents_delete_own') then
    create policy npc_agents_delete_own on public.npc_agents for delete to authenticated using (public.is_campaign_owner(campaign_id));
  end if;
end $$;
