"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const SESSION_PHASES = [
  "prep",
  "exploration",
  "roleplay",
  "combat",
] as const;

export type SessionPhase = (typeof SESSION_PHASES)[number];

function extractOptionalName(input?: string | FormData) {
  if (!input) return "";
  if (typeof input === "string") return input.trim();
  const raw = input.get("name");
  return typeof raw === "string" ? raw.trim() : "";
}

function normalizeOptionalName(value?: string | FormData) {
  const name = extractOptionalName(value);
  if (!name) return null;
  if (name.length > 80) return name.slice(0, 80);
  return name;
}

function isSessionPhase(value: unknown): value is SessionPhase {
  return typeof value === "string" && (SESSION_PHASES as readonly string[]).includes(value);
}

export async function listSessions(campaignId: string): Promise<SessionRow[]> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return [];

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, campaign_id, name, status, phase, started_at, ended_at, token_budget_used, summary_json, notes_md, created_at, updated_at",
    )
    .eq("campaign_id", campaignId)
    .order("started_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * If an active session already exists for this campaign, we redirect to it.
 */
export async function startSession(
  campaignId: string,
  optionalName?: string | FormData,
): Promise<void> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) redirect("/dashboard");

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "active")
    .order("started_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    redirect(`/dashboard/campaigns/${campaignId}/sessions/${existing.id}`);
  }

  const now = new Date().toISOString();
  const name =
    normalizeOptionalName(optionalName) ?? `Session ${now.slice(0, 10)}`;

  const { data: created, error: createError } = await supabase
    .from("sessions")
    .insert({
      campaign_id: campaignId,
      name,
      status: "active",
      phase: "prep",
      started_at: now,
      ended_at: null,
      notes_md: "",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions`);
  redirect(`/dashboard/campaigns/${campaignId}/sessions/${created.id}`);
}

export async function endSession(
  campaignId: string,
  sessionId: string,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      ended_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Session not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`);
  return { ok: true, data: null };
}

export async function setSessionPhase(
  campaignId: string,
  sessionId: string,
  phase: SessionPhase,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (!isSessionPhase(phase)) return { ok: false, error: "Invalid phase." };

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .update({ phase, updated_at: now })
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Session not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`);
  return { ok: true, data: null };
}

export async function updateSessionNotes(
  campaignId: string,
  sessionId: string,
  notesMd: string,
): Promise<ActionResult<null>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .update({ notes_md: notesMd ?? "", updated_at: now })
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Session not found." };

  // Notes are only shown on the session page (for now).
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`);
  return { ok: true, data: null };
}
