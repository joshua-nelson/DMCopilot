import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

export async function getUserProfileByClerkUserId(clerkUserId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("clerk_user_id, display_name, role, created_at, updated_at")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(input: {
  clerkUserId: string;
  displayName: string;
  role?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        clerk_user_id: input.clerkUserId,
        display_name: input.displayName,
        role: input.role ?? "dm",
        updated_at: now,
      },
      { onConflict: "clerk_user_id" },
    )
    .select("clerk_user_id, display_name, role, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}
