"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { getCampaignForUser } from "@/app/(app)/dashboard/campaigns/actions";
import { getAIClient, getDefaultOpenRouterModel } from "@/lib/ai/client";
import { buildSessionSummaryPrompt } from "@/lib/ai/prompts/session-summary";
import { trackAICall } from "@/lib/ai/trackAICall";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { z } from "zod";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type ChatCompletionLike = {
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message?: {
      content?: unknown;
      tool_calls?: Array<{
        function?: {
          arguments?: unknown;
        };
      }>;
    };
  }>;
};

const sessionSummarySchema = z
  .object({
    events: z
      .array(
        z
          .object({
            type: z.enum(["combat", "discovery", "decision", "npc_met"]),
            description: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
    npcs_encountered: z
      .array(
        z
          .object({
            name: z.string().min(1),
            role: z.string().min(1),
            relationship: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
    loot_gained: z
      .array(
        z
          .object({
            item: z.string().min(1),
            quantity: z.number().int().min(1),
          })
          .strict(),
      )
      .default([]),
    decisions_made: z
      .array(
        z
          .object({
            choice: z.string().min(1),
            consequence: z.string().min(1).optional(),
          })
          .strict(),
      )
      .default([]),
    unresolved_threads: z
      .array(
        z
          .object({
            thread: z.string().min(1),
            last_mentioned: z.string().min(1),
          })
          .strict(),
      )
      .default([]),
    next_session_hooks: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

function extractEncounterParticipantNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = (item as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim().length > 0) out.push(name.trim());
  }
  return Array.from(new Set(out));
}

function extractJsonObjectFromText(text: string): string | null {
  // Best-effort fallback when tool-calling is not honored.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

const SESSION_SUMMARY_TOOL = {
  type: "function" as const,
  function: {
    name: "session_summary",
    description:
      "Generate a structured post-session summary JSON matching the required schema.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: [
        "events",
        "npcs_encountered",
        "loot_gained",
        "decisions_made",
        "unresolved_threads",
        "next_session_hooks",
      ],
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type", "description"],
            properties: {
              type: {
                type: "string",
                enum: ["combat", "discovery", "decision", "npc_met"],
              },
              description: { type: "string" },
            },
          },
        },
        npcs_encountered: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "role", "relationship"],
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              relationship: { type: "string" },
            },
          },
        },
        loot_gained: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["item", "quantity"],
            properties: {
              item: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
            },
          },
        },
        decisions_made: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["choice"],
            properties: {
              choice: { type: "string" },
              consequence: { type: "string" },
            },
          },
        },
        unresolved_threads: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["thread", "last_mentioned"],
            properties: {
              thread: { type: "string" },
              last_mentioned: { type: "string" },
            },
          },
        },
        next_session_hooks: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
};

export async function generateSessionSummary(
  campaignId: string,
  sessionId: string,
): Promise<ActionResult<{ summary: SessionSummary }>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const supabase = getSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id, notes_md")
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return { ok: false, error: "Session not found." };

  const { data: lastEncounter, error: encounterError } = await supabase
    .from("encounters")
    .select("id, status, participants, round, created_at")
    .eq("campaign_id", campaignId)
    .eq("session_id", sessionId)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (encounterError) throw encounterError;

  const encounterSummary = lastEncounter
    ? [
        `Encounter: ${lastEncounter.status} (round ${lastEncounter.round})`,
        (() => {
          const names = extractEncounterParticipantNames(lastEncounter.participants);
          return names.length ? `Participants: ${names.join(", ")}` : "Participants: (unknown)";
        })(),
      ].join("\n")
    : null;

  const promptText = buildSessionSummaryPrompt({
    notesMd: session.notes_md ?? "",
    encounterSummary,
  });

  const model = getDefaultOpenRouterModel();
  const start = Date.now();

  let completion: unknown;

  try {
    const client = getAIClient();
    completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from session notes. Always follow the provided schema exactly.",
        },
        { role: "user", content: promptText },
      ],
      tools: [SESSION_SUMMARY_TOOL],
      tool_choice: { type: "function", function: { name: "session_summary" } },
      temperature: 0.2,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Common dev failure: missing OPENROUTER_API_KEY.
    return { ok: false, error: `AI summary generation failed: ${msg}` };
  }

  const latencyMs = Date.now() - start;

  const completionLike = completion as ChatCompletionLike;

  const usage = completionLike.usage
    ? {
        inputTokens: completionLike.usage.prompt_tokens,
        outputTokens: completionLike.usage.completion_tokens,
        totalTokens: completionLike.usage.total_tokens,
      }
    : undefined;

  const msg = completionLike.choices?.[0]?.message;
  const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;

  let rawJsonText: string | null = null;
  let usedTool = false;
  if (typeof toolArgs === "string" && toolArgs.trim().length > 0) {
    rawJsonText = toolArgs;
    usedTool = true;
  } else if (typeof msg?.content === "string" && msg.content.trim().length > 0) {
    rawJsonText = extractJsonObjectFromText(msg.content);
  }

  if (!rawJsonText) {
    await trackAICall({
      clerkUserId: campaign.dm_user_id,
      feature: "session.summary",
      provider: "openrouter",
      model,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      costUsd: 0,
      latencyMs,
      metadata: {
        campaignId,
        sessionId,
        usedTool,
        error: "missing_tool_args_and_no_json_content",
      } satisfies Json,
    });
    return { ok: false, error: "AI did not return a usable summary." };
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawJsonText);
  } catch {
    await trackAICall({
      clerkUserId: campaign.dm_user_id,
      feature: "session.summary",
      provider: "openrouter",
      model,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      costUsd: 0,
      latencyMs,
      metadata: {
        campaignId,
        sessionId,
        usedTool,
        error: "invalid_json",
      } satisfies Json,
    });
    return { ok: false, error: "AI returned invalid JSON." };
  }

  const validated = sessionSummarySchema.safeParse(parsedUnknown);
  if (!validated.success) {
    await trackAICall({
      clerkUserId: campaign.dm_user_id,
      feature: "session.summary",
      provider: "openrouter",
      model,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      costUsd: 0,
      latencyMs,
      metadata: {
        campaignId,
        sessionId,
        usedTool,
        error: "schema_mismatch",
        issues: validated.error.issues
          .slice(0, 10)
          .map((i) => ({ path: i.path, message: i.message })),
      } satisfies Json,
    });
    return {
      ok: false,
      error: `AI summary did not match schema: ${validated.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("sessions")
    .update({
      summary_json: validated.data as unknown as Json,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Session not found." };

  await trackAICall({
    clerkUserId: campaign.dm_user_id,
    feature: "session.summary",
    provider: "openrouter",
    model,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    costUsd: 0,
    latencyMs,
    metadata: {
      campaignId,
      sessionId,
      usedTool,
      ok: true,
    } satisfies Json,
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`);

  return { ok: true, data: { summary: validated.data } };
}

export async function updateSessionSummaryJson(
  campaignId: string,
  sessionId: string,
  jsonText: string,
): Promise<ActionResult<{ summary: SessionSummary }>> {
  const campaign = await getCampaignForUser(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  const validated = sessionSummarySchema.safeParse(parsedUnknown);
  if (!validated.success) {
    return {
      ok: false,
      error: `Summary JSON did not match schema: ${validated.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    };
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("sessions")
    .update({
      summary_json: validated.data as unknown as Json,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("campaign_id", campaignId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return { ok: false, error: "Session not found." };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}`);

  return { ok: true, data: { summary: validated.data } };
}
