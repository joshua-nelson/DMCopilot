"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { setSessionPhase } from "@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type EncounterRow = Database["public"]["Tables"]["encounters"]["Row"];
export type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ENCOUNTER_SELECT =
  "id, campaign_id, session_id, status, participants, round, active_turn_idx, created_at, updated_at";

const CHARACTER_COMBAT_SELECT =
  "id, campaign_id, name, hp_current, hp_max, ac, initiative_bonus";

export type EncounterParticipant = {
  character_id: string;
  name: string;
  initiative: number;
  conditions: string[];
};

export type EncounterParticipantView = EncounterParticipant & {
  hp_current: number | null;
  hp_max: number | null;
  ac: number | null;
};

export type EncounterDetails = {
  encounter: EncounterRow;
  participants: EncounterParticipantView[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

function sortParticipants(participants: EncounterParticipant[]) {
  return [...participants].sort((a, b) => {
    const initDiff = b.initiative - a.initiative;
    if (initDiff !== 0) return initDiff;
    return a.name.localeCompare(b.name);
  });
}

function parseParticipants(raw: unknown): EncounterParticipant[] {
  if (!Array.isArray(raw)) return [];

  const out: EncounterParticipant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const character_id = rec.character_id;
    const name = rec.name;
    const initiative = rec.initiative;
    const conditions = rec.conditions;

    if (!isNonEmptyString(character_id)) continue;
    if (!isNonEmptyString(name)) continue;
    const init = asInt(initiative);
    if (init === null) continue;

    out.push({
      character_id: character_id.trim(),
      name: name.trim(),
      initiative: init,
      conditions: Array.isArray(conditions)
        ? conditions.filter(isNonEmptyString).map((c) => c.trim())
        : [],
    });
  }
  return out;
}

function parseConditionsInput(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function ensureCampaignAndSession(
  campaignId: string,
  sessionId: string,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Session not found." };

  return { ok: true, data: null };
}

export async function listEncounters(
  campaignId: string,
  sessionId: string,
): Promise<EncounterRow[]> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return [];

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("encounters")
    .select(ENCOUNTER_SELECT)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getEncounter(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<EncounterDetails | null> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return null;

  const supabase = getSupabaseAdminClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select(ENCOUNTER_SELECT)
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!encounter) return null;

  const participants = parseParticipants(encounter.participants);
  const characterIds = participants.map((p) => p.character_id);

  const characterById = new Map<string, Pick<CharacterRow, "hp_current" | "hp_max" | "ac">>();
  if (characterIds.length) {
    const { data: characters, error: charactersError } = await supabase
      .from("characters")
      .select(CHARACTER_COMBAT_SELECT)
      .eq("campaign_id", campaignId)
      .in("id", characterIds);

    if (charactersError) throw charactersError;
    for (const c of characters ?? []) {
      characterById.set(c.id, {
        hp_current: c.hp_current ?? null,
        hp_max: c.hp_max ?? null,
        ac: c.ac ?? null,
      });
    }
  }

  const view: EncounterParticipantView[] = participants.map((p) => {
    const c = characterById.get(p.character_id);
    return {
      ...p,
      hp_current: c?.hp_current ?? null,
      hp_max: c?.hp_max ?? null,
      ac: c?.ac ?? null,
    };
  });

  return { encounter, participants: view };
}

export type StartEncounterInput = {
  characterIds: string[];
  initiatives?: Record<string, number | null | undefined>;
};

export async function startEncounter(
  campaignId: string,
  sessionId: string,
  input: StartEncounterInput,
): Promise<ActionResult<{ encounterId: string }>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;

  const characterIds = Array.from(
    new Set((input.characterIds ?? []).filter(isNonEmptyString).map((id) => id.trim())),
  );
  if (!characterIds.length) {
    return { ok: false, error: "Select at least one participant." };
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("encounters")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    return { ok: false, error: "An active encounter already exists for this session." };
  }

  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select(CHARACTER_COMBAT_SELECT)
    .eq("campaign_id", campaignId)
    .in("id", characterIds);

  if (charactersError) throw charactersError;
  const found = characters ?? [];
  if (found.length !== characterIds.length) {
    return { ok: false, error: "One or more selected characters were not found." };
  }

  const initiatives = input.initiatives ?? {};
  const participants: EncounterParticipant[] = found.map((c) => {
    const provided = initiatives[c.id];
    const providedInt = provided === null || provided === undefined ? null : asInt(provided);
    const initiative = providedInt ?? rollD20() + (c.initiative_bonus ?? 0);
    return {
      character_id: c.id,
      name: c.name,
      initiative,
      conditions: [],
    };
  });

  const sorted = sortParticipants(participants);
  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabase
    .from("encounters")
    .insert({
      campaign_id: campaignId,
      session_id: sessionId,
      status: "active",
      participants: sorted,
      round: 1,
      active_turn_idx: 0,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  // Best-effort: switch session phase to combat.
  try {
    await setSessionPhase(campaignId, sessionId, "combat");
  } catch {
    // ignore
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters`);

  return { ok: true, data: { encounterId: created.id } };
}

export type StartEncounterFormState = { error: string | null };

export async function startEncounterFormAction(
  campaignId: string,
  sessionId: string,
  _prevState: StartEncounterFormState,
  formData: FormData,
): Promise<StartEncounterFormState> {
  const rawIds = formData.getAll("characterIds");
  const characterIds = rawIds.filter(isNonEmptyString);

  const initiatives: Record<string, number | null> = {};
  for (const id of characterIds) {
    const raw = formData.get(`initiative_${id}`);
    if (raw === null || raw === undefined || raw === "") {
      initiatives[id] = null;
      continue;
    }
    const n = asInt(raw);
    if (n === null) {
      return { error: "Initiative must be a number." };
    }
    initiatives[id] = n;
  }

  const result = await startEncounter(campaignId, sessionId, {
    characterIds,
    initiatives,
  });

  if (!result.ok) return { error: result.error };
  redirect(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${result.data.encounterId}`,
  );
}

export async function setActiveTurn(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  active_turn_idx: number,
): Promise<ActionResult<null>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;

  const supabase = getSupabaseAdminClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("participants")
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!encounter) return { ok: false, error: "Encounter not found." };

  const participants = parseParticipants(encounter.participants);
  if (!participants.length) {
    return { ok: false, error: "Encounter has no participants." };
  }

  const idx = Math.max(0, Math.min(participants.length - 1, asInt(active_turn_idx) ?? 0));
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("encounters")
    .update({ active_turn_idx: idx, updated_at: now })
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Encounter not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters`);
  revalidatePath(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`,
  );
  return { ok: true, data: null };
}

export async function nextTurn(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<ActionResult<null>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;

  const supabase = getSupabaseAdminClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("participants, round, active_turn_idx")
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!encounter) return { ok: false, error: "Encounter not found." };

  const participants = parseParticipants(encounter.participants);
  if (!participants.length) {
    return { ok: false, error: "Encounter has no participants." };
  }

  const currentIdx = Math.max(0, Math.min(participants.length - 1, asInt(encounter.active_turn_idx) ?? 0));
  const nextIdx = currentIdx + 1;
  const wraps = nextIdx >= participants.length;
  const newIdx = wraps ? 0 : nextIdx;
  const newRound = (asInt(encounter.round) ?? 1) + (wraps ? 1 : 0);
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("encounters")
    .update({ active_turn_idx: newIdx, round: newRound, updated_at: now })
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Encounter not found." };

  revalidatePath(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`,
  );
  return { ok: true, data: null };
}

export async function updateParticipantInitiative(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  characterId: string,
  initiative: number,
): Promise<ActionResult<null>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;
  if (!isNonEmptyString(characterId)) return { ok: false, error: "Invalid character." };

  const init = asInt(initiative);
  if (init === null) return { ok: false, error: "Initiative must be a number." };

  const supabase = getSupabaseAdminClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("participants, active_turn_idx")
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!encounter) return { ok: false, error: "Encounter not found." };

  const participants = parseParticipants(encounter.participants);
  if (!participants.length) {
    return { ok: false, error: "Encounter has no participants." };
  }

  const currentIdx = Math.max(0, Math.min(participants.length - 1, asInt(encounter.active_turn_idx) ?? 0));
  const activeId = participants[currentIdx]?.character_id;

  const idx = participants.findIndex((p) => p.character_id === characterId);
  if (idx === -1) return { ok: false, error: "Participant not found." };

  participants[idx] = { ...participants[idx], initiative: init };
  const sorted = sortParticipants(participants);

  const newActiveIdx = activeId
    ? Math.max(0, sorted.findIndex((p) => p.character_id === activeId))
    : 0;

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("encounters")
    .update({ participants: sorted, active_turn_idx: newActiveIdx, updated_at: now })
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Encounter not found." };

  revalidatePath(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`,
  );
  return { ok: true, data: null };
}

export async function moveParticipant(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  characterId: string,
  direction: "up" | "down",
): Promise<ActionResult<null>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;
  if (!isNonEmptyString(characterId)) return { ok: false, error: "Invalid character." };

  const supabase = getSupabaseAdminClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("participants, active_turn_idx")
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!encounter) return { ok: false, error: "Encounter not found." };

  const participants = parseParticipants(encounter.participants);
  if (!participants.length) {
    return { ok: false, error: "Encounter has no participants." };
  }

  const currentIdx = Math.max(0, Math.min(participants.length - 1, asInt(encounter.active_turn_idx) ?? 0));
  const activeId = participants[currentIdx]?.character_id;

  const idx = participants.findIndex((p) => p.character_id === characterId);
  if (idx === -1) return { ok: false, error: "Participant not found." };

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= participants.length) {
    return { ok: true, data: null };
  }

  const next = [...participants];
  const tmp = next[idx];
  next[idx] = next[swapWith];
  next[swapWith] = tmp;

  const newActiveIdx = activeId
    ? Math.max(0, next.findIndex((p) => p.character_id === activeId))
    : 0;

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("encounters")
    .update({ participants: next, active_turn_idx: newActiveIdx, updated_at: now })
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Encounter not found." };

  revalidatePath(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`,
  );
  return { ok: true, data: null };
}

export async function setParticipantConditions(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  characterId: string,
  conditions: string[],
): Promise<ActionResult<null>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;
  if (!isNonEmptyString(characterId)) return { ok: false, error: "Invalid character." };

  const supabase = getSupabaseAdminClient();
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("participants")
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!encounter) return { ok: false, error: "Encounter not found." };

  const participants = parseParticipants(encounter.participants);
  const idx = participants.findIndex((p) => p.character_id === characterId);
  if (idx === -1) return { ok: false, error: "Participant not found." };

  participants[idx] = {
    ...participants[idx],
    conditions: (conditions ?? []).filter(isNonEmptyString).map((c) => c.trim()),
  };

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("encounters")
    .update({ participants, updated_at: now })
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Encounter not found." };

  revalidatePath(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`,
  );
  return { ok: true, data: null };
}

export async function adjustCharacterHp(
  campaignId: string,
  characterId: string,
  delta: number,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (!isNonEmptyString(characterId)) return { ok: false, error: "Invalid character." };

  const d = asInt(delta);
  if (d === null) return { ok: false, error: "Invalid HP adjustment." };

  const supabase = getSupabaseAdminClient();
  const { data: existing, error } = await supabase
    .from("characters")
    .select("hp_current, hp_max")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) throw error;
  if (!existing) return { ok: false, error: "Character not found." };

  const current = asInt(existing.hp_current) ?? 0;
  const max = asInt(existing.hp_max);

  let next = current + d;
  if (next < 0) next = 0;
  if (max !== null && next > max) next = max;

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("characters")
    .update({ hp_current: next, updated_at: now })
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Character not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  return { ok: true, data: null };
}

export async function setCharacterHp(
  campaignId: string,
  characterId: string,
  hp_current: number,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (!isNonEmptyString(characterId)) return { ok: false, error: "Invalid character." };

  const hp = asInt(hp_current);
  if (hp === null || hp < 0) return { ok: false, error: "HP must be a non-negative number." };

  const supabase = getSupabaseAdminClient();
  const { data: existing, error } = await supabase
    .from("characters")
    .select("hp_max")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) throw error;
  if (!existing) return { ok: false, error: "Character not found." };

  const max = asInt(existing.hp_max);
  const next = max !== null ? Math.min(hp, max) : hp;
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("characters")
    .update({ hp_current: next, updated_at: now })
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Character not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  return { ok: true, data: null };
}

export async function endEncounter(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<ActionResult<null>> {
  const verified = await ensureCampaignAndSession(campaignId, sessionId);
  if (!verified.ok) return verified;

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("encounters")
    .update({ status: "completed", updated_at: now })
    .eq("id", encounterId)
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Encounter not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters`);
  revalidatePath(
    `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/encounters/${encounterId}`,
  );
  return { ok: true, data: null };
}

export async function updateParticipantInitiativeFormAction(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  characterId: string,
  formData: FormData,
): Promise<void> {
  const raw = formData.get("initiative");
  const initiative = asInt(raw);
  if (initiative === null) return;
  await updateParticipantInitiative(
    campaignId,
    sessionId,
    encounterId,
    characterId,
    initiative,
  );
}

export async function setParticipantConditionsFormAction(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  characterId: string,
  formData: FormData,
): Promise<void> {
  const raw = formData.get("conditions");
  const conditions = parseConditionsInput(raw);
  await setParticipantConditions(campaignId, sessionId, encounterId, characterId, conditions);
}

export async function nextTurnFormAction(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  _formData: FormData,
): Promise<void> {
  void _formData;
  const result = await nextTurn(campaignId, sessionId, encounterId);
  if (!result.ok) throw new Error(result.error);
}

export async function setActiveTurnFormAction(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  active_turn_idx: number,
  _formData: FormData,
): Promise<void> {
  void _formData;
  const result = await setActiveTurn(
    campaignId,
    sessionId,
    encounterId,
    active_turn_idx,
  );
  if (!result.ok) throw new Error(result.error);
}

export async function moveParticipantFormAction(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  characterId: string,
  direction: "up" | "down",
  _formData: FormData,
): Promise<void> {
  void _formData;
  const result = await moveParticipant(
    campaignId,
    sessionId,
    encounterId,
    characterId,
    direction,
  );
  if (!result.ok) throw new Error(result.error);
}

export async function adjustCharacterHpFormAction(
  campaignId: string,
  characterId: string,
  delta: number,
  _formData: FormData,
): Promise<void> {
  void _formData;
  const result = await adjustCharacterHp(campaignId, characterId, delta);
  if (!result.ok) throw new Error(result.error);
}
