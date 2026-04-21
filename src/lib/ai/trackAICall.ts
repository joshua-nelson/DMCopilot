import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export type TrackAICallInput = {
  clerkUserId: string;
  feature: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cacheHit?: boolean;
  costUsd?: number;
  latencyMs?: number;
  metadata?: Json;
};

/**
 * Server-side AI call tracking.
 *
 * Must never break the user flow: failures are logged and swallowed.
 */
export async function trackAICall(input: TrackAICallInput): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();

    // Cast to any: Supabase generated types may lag behind SQL migrations.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("ai_calls") as any).insert({
      clerk_user_id: input.clerkUserId,
      feature: input.feature,
      provider: input.provider,
      model: input.model,
      input_tokens: input.inputTokens ?? 0,
      output_tokens: input.outputTokens ?? 0,
      cache_read_input_tokens: input.cache_read_input_tokens ?? null,
      cache_creation_input_tokens: input.cache_creation_input_tokens ?? null,
      cache_hit: input.cacheHit ?? false,
      cost_usd: input.costUsd ?? 0,
      latency_ms: input.latencyMs ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) {
      // Don't throw: metrics should never be user-impacting.
      console.warn("trackAICall: insert failed", {
        message: error.message,
        code: (error as { code?: string }).code,
      });
    }
  } catch (err) {
    console.warn("trackAICall: unexpected failure", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
