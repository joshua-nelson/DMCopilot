-- Phase 1: Seed data (dev/demo)
--
-- Inserts:
-- - 1 demo DM user_profile mapping
-- - 1 campaign (Lost Mine of Phandelver)
-- - 1 active session
-- - 4 level-1 characters (Fighter/Wizard/Cleric/Rogue)
--
-- Note: If you want this seed data to be visible under RLS for your own account,
-- update user_profiles.auth_user_id to match your auth.uid().

-- Deterministic IDs for idempotent seeding
-- demo auth uid: 00000000-0000-0000-0000-000000000001
-- campaign:       11111111-1111-1111-1111-111111111111
-- session:        22222222-2222-2222-2222-222222222222

insert into public.user_profiles (clerk_user_id, display_name, role, auth_user_id)
values ('demo_clerk_dm', 'Demo DM', 'dm', '00000000-0000-0000-0000-000000000001')
on conflict (clerk_user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    auth_user_id = coalesce(public.user_profiles.auth_user_id, excluded.auth_user_id),
    updated_at = now();

insert into public.campaigns (id, dm_user_id, name, system, description, created_at, updated_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'demo_clerk_dm',
  'Lost Mine of Phandelver',
  'd&d5e',
  'Demo campaign seed for Phase 1 schema validation.',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.sessions (
  id,
  campaign_id,
  name,
  status,
  phase,
  started_at,
  token_budget_used,
  created_at,
  updated_at
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Session 1: Arrival in Phandalin',
  'active',
  'roleplay',
  now(),
  0,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.characters (
  id,
  campaign_id,
  name,
  type,
  is_npc,
  player_name,
  class,
  race,
  level,
  str, dex, con, int, wis, cha,
  hp_current, hp_max,
  ac,
  initiative_bonus,
  speed,
  created_at,
  updated_at
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Thorin Ironfist',
    'pc',
    false,
    'Player 1',
    'Fighter',
    'Dwarf',
    1,
    16, 12, 14, 10, 10, 8,
    12, 12,
    16,
    1,
    25,
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'Elara Moonwhisper',
    'pc',
    false,
    'Player 2',
    'Wizard',
    'High Elf',
    1,
    8, 14, 12, 16, 10, 10,
    8, 8,
    12,
    2,
    30,
    now(),
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'Sister Amaya',
    'pc',
    false,
    'Player 3',
    'Cleric',
    'Human',
    1,
    12, 10, 14, 10, 16, 10,
    10, 10,
    16,
    0,
    30,
    now(),
    now()
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'Finn Quickstep',
    'pc',
    false,
    'Player 4',
    'Rogue',
    'Lightfoot Halfling',
    1,
    10, 16, 12, 10, 10, 14,
    10, 10,
    14,
    3,
    25,
    now(),
    now()
  )
on conflict (id) do nothing;
