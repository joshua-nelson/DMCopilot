"use server";

import "server-only";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const CAMPAIGN_COOKIE_NAME = "dm_campaign_id";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const VALID_TONES = [
  "heroic",
  "gritty",
  "dark",
  "horror",
  "comedic",
  "mystery",
  "epic",
  "swashbuckling",
] as const;

function validateCampaignInput(input: {
  name: string;
  description?: string;
  system?: string;
  tone?: string;
}): ActionResult<{
  name: string;
  description: string | null;
  system: string;
  tone: string;
}> {
  const name = input.name.trim();
  const description = input.description?.trim() ?? "";
  const system = (input.system?.trim() || "d&d5e").trim();
  const tone = (input.tone?.trim() || "heroic").trim();

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Campaign name must be 2–80 characters." };
  }
  if (description.length > 2000) {
    return { ok: false, error: "Description must be 0–2000 characters." };
  }
  if (system.length < 1 || system.length > 40) {
    return { ok: false, error: "System must be 1–40 characters." };
  }
  if (!VALID_TONES.includes(tone as (typeof VALID_TONES)[number])) {
    return { ok: false, error: `Tone must be one of: ${VALID_TONES.join(", ")}.` };
  }

  return {
    ok: true,
    data: {
      name,
      description: description.length ? description : null,
      system,
      tone,
    },
  };
}

const CAMPAIGN_SELECT =
  "id, dm_user_id, name, system, tone, description, is_archived, settings_json, created_at, updated_at";

export async function listCampaignsForUser(): Promise<CampaignRow[]> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("dm_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCampaignForUser(
  campaignId: string,
): Promise<CampaignRow | null> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("id", campaignId)
    .eq("dm_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCampaign(input: {
  name: string;
  description?: string;
  system?: string;
  tone?: string;
}): Promise<ActionResult<CampaignRow>> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const validated = validateCampaignInput(input);
  if (!validated.ok) return validated;

  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      dm_user_id: userId,
      name: validated.data.name,
      description: validated.data.description,
      system: validated.data.system,
      tone: validated.data.tone,
      created_at: now,
      updated_at: now,
    })
    .select(CAMPAIGN_SELECT)
    .single();

  if (error) throw error;

  revalidatePath("/dashboard");
  return { ok: true, data };
}

export async function updateCampaign(
  campaignId: string,
  updates: { name?: string; description?: string; system?: string; tone?: string },
): Promise<ActionResult<CampaignRow>> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const name =
    typeof updates.name === "string" ? updates.name.trim() : undefined;
  const description =
    typeof updates.description === "string"
      ? updates.description.trim()
      : undefined;
  const system =
    typeof updates.system === "string" ? updates.system.trim() : undefined;
  const tone =
    typeof updates.tone === "string" ? updates.tone.trim() : undefined;

  if (name !== undefined && (name.length < 2 || name.length > 80)) {
    return { ok: false, error: "Campaign name must be 2–80 characters." };
  }
  if (description !== undefined && description.length > 2000) {
    return { ok: false, error: "Description must be 0–2000 characters." };
  }
  if (system !== undefined && (system.length < 1 || system.length > 40)) {
    return { ok: false, error: "System must be 1–40 characters." };
  }
  if (
    tone !== undefined &&
    !VALID_TONES.includes(tone as (typeof VALID_TONES)[number])
  ) {
    return { ok: false, error: `Tone must be one of: ${VALID_TONES.join(", ")}.` };
  }

  const updatePayload: Database["public"]["Tables"]["campaigns"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updatePayload.name = name;
  if (description !== undefined)
    updatePayload.description = description.length ? description : null;
  if (system !== undefined) updatePayload.system = system;
  if (tone !== undefined) updatePayload.tone = tone;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update(updatePayload)
    .eq("id", campaignId)
    .eq("dm_user_id", userId)
    .select(CAMPAIGN_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Campaign not found." };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/settings`);
  return { ok: true, data };
}

export async function setCampaignArchived(
  campaignId: string,
  isArchived: boolean,
): Promise<ActionResult<CampaignRow>> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("dm_user_id", userId)
    .select(CAMPAIGN_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Campaign not found." };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/settings`);
  return { ok: true, data };
}

export async function deleteCampaign(
  campaignId: string,
): Promise<ActionResult<null>> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("dm_user_id", userId);

  if (error) throw error;

  const store = await cookies();
  const current = store.get(CAMPAIGN_COOKIE_NAME)?.value;
  if (current === campaignId) {
    store.set(CAMPAIGN_COOKIE_NAME, "", {
      path: "/dashboard",
      maxAge: 0,
    });
  }

  revalidatePath("/dashboard");
  return { ok: true, data: null };
}

export async function setCurrentCampaign(
  campaignId: string,
): Promise<ActionResult<null>> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("dm_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Campaign not found." };

  const store = await cookies();
  store.set(CAMPAIGN_COOKIE_NAME, campaignId, {
    path: "/dashboard",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, data: null };
}

export async function getCurrentCampaignIdCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(CAMPAIGN_COOKIE_NAME)?.value;
  if (!value) return null;
  return value;
}

export type CampaignFormState = { error: string | null };

export async function createCampaignFormAction(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const result = await createCampaign({
    name: normalizeText(formData.get("name")),
    description: normalizeText(formData.get("description")),
    system: normalizeText(formData.get("system")),
    tone: normalizeText(formData.get("tone")),
  });

  if (!result.ok) return { error: result.error };

  await setCurrentCampaign(result.data.id);
  redirect(`/dashboard/campaigns/${result.data.id}`);
}

export async function updateCampaignFormAction(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const result = await updateCampaign(campaignId, {
    name: normalizeText(formData.get("name")),
    description: normalizeText(formData.get("description")),
    system: normalizeText(formData.get("system")),
    tone: normalizeText(formData.get("tone")),
  });

  if (!result.ok) return { error: result.error };

  redirect(`/dashboard/campaigns/${campaignId}/settings`);
}

export async function archiveCampaignFormAction(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const campaignId = normalizeText(formData.get("campaignId"));
  const value = normalizeText(formData.get("isArchived"));
  const isArchived = value === "true";

  if (!campaignId) return { error: "Missing campaign id." };

  const result = await setCampaignArchived(campaignId, isArchived);
  if (!result.ok) return { error: result.error };

  redirect(`/dashboard/campaigns/${campaignId}/settings`);
}

export async function deleteCampaignFormAction(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const campaignId = normalizeText(formData.get("campaignId"));
  const confirmation = normalizeText(formData.get("confirmation"));

  if (!campaignId) return { error: "Missing campaign id." };
  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  const result = await deleteCampaign(campaignId);
  if (!result.ok) return { error: result.error };

  redirect("/dashboard");
}
