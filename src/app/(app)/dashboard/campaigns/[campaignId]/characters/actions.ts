"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type CharacterRow = Database["public"]["Tables"]["characters"]["Row"] & {
  // Supabase generated types may lag migrations. Keep this optional.
  inventory?: unknown;
};
export type CharacterType = "pc" | "npc" | "monster";

// Spell slots: keyed by spell level "1"–"9"
export type SpellSlots = Record<string, { total: number; used: number }>;

// Inventory item
export type InventoryItem = { id: string; name: string; quantity: number; description?: string };

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const CHARACTER_SELECT =
  "id, campaign_id, name, type, is_npc, player_name, class, race, level, str, dex, con, int, wis, cha, hp_current, hp_max, ac, initiative_bonus, speed, saves, skills, features, spell_slots, conditions, portrait_url, speaker_color, voice_id, aliases, created_at, updated_at";

const spellSlotsSchema: z.ZodType<SpellSlots> = z
  .record(
    z.string().regex(/^[1-9]$/, { message: "Spell slot level must be 1–9." }),
    z.object({
      total: z.number().int().min(0).max(99),
      used: z.number().int().min(0).max(99),
    }),
  )
  .superRefine((slots, ctx) => {
    for (const [level, entry] of Object.entries(slots)) {
      if (entry.used > entry.total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Used spell slots cannot exceed total (level ${level}).`,
          path: [level, "used"],
        });
      }
    }
  });

const inventoryItemSchema: z.ZodType<InventoryItem> = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(0).max(9999),
  description: z.string().trim().max(500).optional(),
});

const inventorySchema = z.array(inventoryItemSchema).max(200);

function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized.length ? normalized : null;
}

function parseOptionalInt(value: unknown): number | undefined {
  const raw = normalizeText(value);
  if (!raw) return undefined;
  return Number(raw);
}

function isCharacterType(value: unknown): value is CharacterType {
  return value === "pc" || value === "npc" || value === "monster";
}

function validateInt(
  value: unknown,
  fieldLabel: string,
  opts?: { min?: number; max?: number; required?: boolean },
): ActionResult<number | null> {
  if (value === null || value === undefined || value === "") {
    if (opts?.required) return { ok: false, error: `${fieldLabel} is required.` };
    return { ok: true, data: null };
  }

  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n)) return { ok: false, error: `${fieldLabel} must be a number.` };
  if (!Number.isInteger(n)) return { ok: false, error: `${fieldLabel} must be an integer.` };
  if (opts?.min !== undefined && n < opts.min) {
    return { ok: false, error: `${fieldLabel} must be at least ${opts.min}.` };
  }
  if (opts?.max !== undefined && n > opts.max) {
    return { ok: false, error: `${fieldLabel} must be at most ${opts.max}.` };
  }
  return { ok: true, data: n };
}

export async function listCharacters(
  campaignId: string,
  opts?: { type?: CharacterType },
): Promise<CharacterRow[]> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return [];

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("characters")
    .select(CHARACTER_SELECT)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (opts?.type) query = query.eq("type", opts.type);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCharacter(
  campaignId: string,
  characterId: string,
): Promise<CharacterRow | null> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return null;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type CreateCharacterInput = {
  name: string;
  type?: CharacterType;
  player_name?: string | null;
  class?: string | null;
  race?: string | null;
  level?: number;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  hp_current?: number | null;
  hp_max?: number | null;
  ac?: number | null;
  initiative_bonus?: number;
  speed?: number | null;
};

function validateCreateInput(
  input: CreateCharacterInput,
): ActionResult<Required<CreateCharacterInput>> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Name must be 2–80 characters." };
  }

  const type: CharacterType = input.type ?? "pc";
  if (!isCharacterType(type)) {
    return { ok: false, error: "Type must be pc, npc, or monster." };
  }

  const levelRes = validateInt(input.level ?? 1, "Level", {
    min: 1,
    required: true,
  });
  if (!levelRes.ok) return levelRes;
  const level = levelRes.data ?? 1;

  const abilityRange = { min: 1, max: 30, required: true } as const;
  const strRes = validateInt(input.str ?? 10, "STR", abilityRange);
  if (!strRes.ok) return strRes;
  const dexRes = validateInt(input.dex ?? 10, "DEX", abilityRange);
  if (!dexRes.ok) return dexRes;
  const conRes = validateInt(input.con ?? 10, "CON", abilityRange);
  if (!conRes.ok) return conRes;
  const intRes = validateInt(input.int ?? 10, "INT", abilityRange);
  if (!intRes.ok) return intRes;
  const wisRes = validateInt(input.wis ?? 10, "WIS", abilityRange);
  if (!wisRes.ok) return wisRes;
  const chaRes = validateInt(input.cha ?? 10, "CHA", abilityRange);
  if (!chaRes.ok) return chaRes;

  const hpCurrentRes = validateInt(input.hp_current, "Current HP", {
    min: 0,
    max: 9999,
  });
  if (!hpCurrentRes.ok) return hpCurrentRes;
  const hpMaxRes = validateInt(input.hp_max, "Max HP", { min: 0, max: 9999 });
  if (!hpMaxRes.ok) return hpMaxRes;
  const acRes = validateInt(input.ac, "AC", { min: 0, max: 50 });
  if (!acRes.ok) return acRes;
  const initRes = validateInt(input.initiative_bonus ?? 0, "Initiative bonus", {
    min: -30,
    max: 30,
    required: true,
  });
  if (!initRes.ok) return initRes;
  const speedRes = validateInt(input.speed, "Speed", { min: 0, max: 1000 });
  if (!speedRes.ok) return speedRes;

  if (
    hpCurrentRes.data !== null &&
    hpMaxRes.data !== null &&
    hpCurrentRes.data > hpMaxRes.data
  ) {
    return { ok: false, error: "Current HP cannot exceed Max HP." };
  }

  return {
    ok: true,
    data: {
      name,
      type,
      player_name: input.player_name ?? null,
      class: input.class ?? null,
      race: input.race ?? null,
      level,
      str: strRes.data ?? 10,
      dex: dexRes.data ?? 10,
      con: conRes.data ?? 10,
      int: intRes.data ?? 10,
      wis: wisRes.data ?? 10,
      cha: chaRes.data ?? 10,
      hp_current: hpCurrentRes.data,
      hp_max: hpMaxRes.data,
      ac: acRes.data,
      initiative_bonus: initRes.data ?? 0,
      speed: speedRes.data,
    },
  };
}

export async function createCharacter(
  campaignId: string,
  input: CreateCharacterInput,
): Promise<ActionResult<CharacterRow>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const validated = validateCreateInput(input);
  if (!validated.ok) return validated;

  const now = new Date().toISOString();
  const isNpc = validated.data.type !== "pc";

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .insert({
      campaign_id: campaignId,
      name: validated.data.name,
      type: validated.data.type,
      is_npc: isNpc,
      player_name: validated.data.player_name,
      class: validated.data.class,
      race: validated.data.race,
      level: validated.data.level,
      str: validated.data.str,
      dex: validated.data.dex,
      con: validated.data.con,
      int: validated.data.int,
      wis: validated.data.wis,
      cha: validated.data.cha,
      hp_current: validated.data.hp_current,
      hp_max: validated.data.hp_max,
      ac: validated.data.ac,
      initiative_bonus: validated.data.initiative_bonus,
      speed: validated.data.speed,
      saves: {},
      skills: {},
      features: [],
      spell_slots: {},
      conditions: [],
      aliases: [],
      created_at: now,
      updated_at: now,
    })
    .select(CHARACTER_SELECT)
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  return { ok: true, data };
}

export type UpdateCharacterInput = Partial<{
  name: string;
  type: CharacterType;
  player_name: string | null;
  class: string | null;
  race: string | null;
  level: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  hp_current: number | null;
  hp_max: number | null;
  ac: number | null;
  initiative_bonus: number;
  speed: number | null;
}>;

function validateUpdateInput(input: UpdateCharacterInput): ActionResult<UpdateCharacterInput> {
  const updates: UpdateCharacterInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) {
      return { ok: false, error: "Name must be 2–80 characters." };
    }
    updates.name = name;
  }

  if (input.type !== undefined) {
    if (!isCharacterType(input.type)) {
      return { ok: false, error: "Type must be pc, npc, or monster." };
    }
    updates.type = input.type;
  }

  if (input.level !== undefined) {
    const levelRes = validateInt(input.level, "Level", { min: 1, required: true });
    if (!levelRes.ok) return levelRes;
    updates.level = levelRes.data ?? 1;
  }

  const abilityRange = { min: 1, max: 30, required: true } as const;
  const abilityFields: Array<[keyof Pick<UpdateCharacterInput, "str" | "dex" | "con" | "int" | "wis" | "cha">, string]> = [
    ["str", "STR"],
    ["dex", "DEX"],
    ["con", "CON"],
    ["int", "INT"],
    ["wis", "WIS"],
    ["cha", "CHA"],
  ];
  for (const [key, label] of abilityFields) {
    const value = input[key];
    if (value === undefined) continue;
    const res = validateInt(value, label, abilityRange);
    if (!res.ok) return res;
    updates[key] = res.data ?? 10;
  }

  if (input.hp_current !== undefined) {
    const res = validateInt(input.hp_current, "Current HP", { min: 0, max: 9999 });
    if (!res.ok) return res;
    updates.hp_current = res.data;
  }
  if (input.hp_max !== undefined) {
    const res = validateInt(input.hp_max, "Max HP", { min: 0, max: 9999 });
    if (!res.ok) return res;
    updates.hp_max = res.data;
  }
  if (input.ac !== undefined) {
    const res = validateInt(input.ac, "AC", { min: 0, max: 50 });
    if (!res.ok) return res;
    updates.ac = res.data;
  }
  if (input.initiative_bonus !== undefined) {
    const res = validateInt(input.initiative_bonus, "Initiative bonus", {
      min: -30,
      max: 30,
      required: true,
    });
    if (!res.ok) return res;
    updates.initiative_bonus = res.data ?? 0;
  }
  if (input.speed !== undefined) {
    const res = validateInt(input.speed, "Speed", { min: 0, max: 1000 });
    if (!res.ok) return res;
    updates.speed = res.data;
  }

  if (input.player_name !== undefined) updates.player_name = input.player_name;
  if (input.class !== undefined) updates.class = input.class;
  if (input.race !== undefined) updates.race = input.race;

  if (
    updates.hp_current !== undefined &&
    updates.hp_max !== undefined &&
    updates.hp_current !== null &&
    updates.hp_max !== null &&
    updates.hp_current > updates.hp_max
  ) {
    return { ok: false, error: "Current HP cannot exceed Max HP." };
  }

  return { ok: true, data: updates };
}

export async function updateCharacter(
  campaignId: string,
  characterId: string,
  updates: UpdateCharacterInput,
): Promise<ActionResult<CharacterRow>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const validated = validateUpdateInput(updates);
  if (!validated.ok) return validated;

  const updatePayload: Database["public"]["Tables"]["characters"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(validated.data)) {
    (updatePayload as Record<string, unknown>)[key] = value;
  }

  if (validated.data.type !== undefined) {
    updatePayload.is_npc = validated.data.type !== "pc";
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .update(updatePayload)
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .select(CHARACTER_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Character not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}/edit`);
  return { ok: true, data };
}

export async function deleteCharacter(
  campaignId: string,
  characterId: string,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", characterId)
    .eq("campaign_id", campaignId);

  if (error) throw error;

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  return { ok: true, data: null };
}

export async function updateSpellSlots(
  campaignId: string,
  characterId: string,
  spellSlots: SpellSlots,
): Promise<ActionResult<void>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const parsed = spellSlotsSchema.safeParse(spellSlots);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .update({
      spell_slots: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Character not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}/edit`);
  return { ok: true, data: undefined };
}

export async function updateInventory(
  campaignId: string,
  characterId: string,
  items: InventoryItem[],
): Promise<ActionResult<void>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const parsed = inventorySchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("characters")
    // Supabase generated types may not include the new column yet.
    .update(
      {
        inventory: parsed.data,
        updated_at: new Date().toISOString(),
      } as unknown as Database["public"]["Tables"]["characters"]["Update"],
    )
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Character not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/characters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}/edit`);
  return { ok: true, data: undefined };
}

function parseSpellSlotsFromFormData(formData: FormData): SpellSlots {
  const result: SpellSlots = {};

  for (let level = 1; level <= 9; level++) {
    const levelKey = String(level);
    const totalRaw = parseOptionalInt(formData.get(`spell_slots_${levelKey}_total`));
    const usedRaw = parseOptionalInt(formData.get(`spell_slots_${levelKey}_used`));

    const total = Math.max(0, totalRaw ?? 0);
    const used = Math.max(0, Math.min(usedRaw ?? 0, total));

    if (total === 0 && used === 0) continue;
    result[levelKey] = { total, used };
  }

  return result;
}

function parseInventoryFromFormData(formData: FormData): InventoryItem[] {
  const ids = formData.getAll("inventory_id").map(normalizeText);
  const names = formData.getAll("inventory_name").map(normalizeText);
  const quantities = formData.getAll("inventory_quantity").map((v) => parseOptionalInt(v));
  const descriptions = formData
    .getAll("inventory_description")
    .map((v) => normalizeText(v));

  const maxLen = Math.max(ids.length, names.length, quantities.length, descriptions.length);
  if (maxLen === 0) return [];
  if (ids.length !== maxLen || names.length !== maxLen || quantities.length !== maxLen) {
    return [];
  }

  const items: InventoryItem[] = [];
  for (let i = 0; i < maxLen; i++) {
    const name = (names[i] ?? "").trim();
    if (!name.length) continue;

    const id = (ids[i] ?? "").trim();
    const quantity = quantities[i] ?? 1;
    const description = (descriptions[i] ?? "").trim();

    items.push({
      id,
      name,
      quantity,
      description: description.length ? description : undefined,
    });
  }

  return items;
}

export type CharacterFormState = { error: string | null };

export async function createCharacterFormAction(
  campaignId: string,
  _prevState: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const spellSlots = parseSpellSlotsFromFormData(formData);
  const spellSlotsParsed = spellSlotsSchema.safeParse(spellSlots);
  if (!spellSlotsParsed.success) {
    return { error: firstZodError(spellSlotsParsed.error) };
  }

  const inventory = parseInventoryFromFormData(formData);
  const inventoryParsed = inventorySchema.safeParse(inventory);
  if (!inventoryParsed.success) {
    return { error: firstZodError(inventoryParsed.error) };
  }

  const result = await createCharacter(campaignId, {
    name: normalizeText(formData.get("name")),
    type: (normalizeText(formData.get("type")) as CharacterType) || undefined,
    player_name: normalizeOptionalText(formData.get("player_name")),
    class: normalizeOptionalText(formData.get("class")),
    race: normalizeOptionalText(formData.get("race")),
    level: parseOptionalInt(formData.get("level")),
    str: parseOptionalInt(formData.get("str")),
    dex: parseOptionalInt(formData.get("dex")),
    con: parseOptionalInt(formData.get("con")),
    int: parseOptionalInt(formData.get("int")),
    wis: parseOptionalInt(formData.get("wis")),
    cha: parseOptionalInt(formData.get("cha")),
    hp_current: parseOptionalInt(formData.get("hp_current")),
    hp_max: parseOptionalInt(formData.get("hp_max")),
    ac: parseOptionalInt(formData.get("ac")),
    initiative_bonus: parseOptionalInt(formData.get("initiative_bonus")),
    speed: parseOptionalInt(formData.get("speed")),
  });

  if (!result.ok) return { error: result.error };

  const spellRes = await updateSpellSlots(
    campaignId,
    result.data.id,
    spellSlotsParsed.data,
  );
  if (!spellRes.ok) return { error: spellRes.error };

  const invRes = await updateInventory(
    campaignId,
    result.data.id,
    inventoryParsed.data,
  );
  if (!invRes.ok) return { error: invRes.error };

  redirect(`/dashboard/campaigns/${campaignId}/characters/${result.data.id}`);
}

export async function updateCharacterFormAction(
  campaignId: string,
  characterId: string,
  _prevState: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const spellSlots = parseSpellSlotsFromFormData(formData);
  const spellSlotsParsed = spellSlotsSchema.safeParse(spellSlots);
  if (!spellSlotsParsed.success) {
    return { error: firstZodError(spellSlotsParsed.error) };
  }

  const inventory = parseInventoryFromFormData(formData);
  const inventoryParsed = inventorySchema.safeParse(inventory);
  if (!inventoryParsed.success) {
    return { error: firstZodError(inventoryParsed.error) };
  }

  const updates: UpdateCharacterInput = {
    name: normalizeText(formData.get("name")),
    type: normalizeText(formData.get("type")) as CharacterType,
    player_name: normalizeOptionalText(formData.get("player_name")),
    class: normalizeOptionalText(formData.get("class")),
    race: normalizeOptionalText(formData.get("race")),
    level: parseOptionalInt(formData.get("level")) ?? 1,
    str: parseOptionalInt(formData.get("str")) ?? 10,
    dex: parseOptionalInt(formData.get("dex")) ?? 10,
    con: parseOptionalInt(formData.get("con")) ?? 10,
    int: parseOptionalInt(formData.get("int")) ?? 10,
    wis: parseOptionalInt(formData.get("wis")) ?? 10,
    cha: parseOptionalInt(formData.get("cha")) ?? 10,
    hp_current: parseOptionalInt(formData.get("hp_current")) ?? null,
    hp_max: parseOptionalInt(formData.get("hp_max")) ?? null,
    ac: parseOptionalInt(formData.get("ac")) ?? null,
    initiative_bonus: parseOptionalInt(formData.get("initiative_bonus")) ?? 0,
    speed: parseOptionalInt(formData.get("speed")) ?? null,
  };

  const result = await updateCharacter(campaignId, characterId, updates);
  if (!result.ok) return { error: result.error };

  const spellRes = await updateSpellSlots(
    campaignId,
    characterId,
    spellSlotsParsed.data,
  );
  if (!spellRes.ok) return { error: spellRes.error };

  const invRes = await updateInventory(
    campaignId,
    characterId,
    inventoryParsed.data,
  );
  if (!invRes.ok) return { error: invRes.error };

  redirect(`/dashboard/campaigns/${campaignId}/characters/${characterId}`);
}

export async function deleteCharacterFormAction(
  campaignId: string,
  characterId: string,
  _prevState: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const confirmation = normalizeText(formData.get("confirmation"));
  if (confirmation !== "DELETE") return { error: "Type DELETE to confirm." };

  const result = await deleteCharacter(campaignId, characterId);
  if (!result.ok) return { error: result.error };
  redirect(`/dashboard/campaigns/${campaignId}/characters`);
}
