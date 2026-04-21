import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSupabaseAdminMock,
  type SupabaseAdminMock,
  type SupabaseResponse,
} from "@/test/mocks/supabaseAdminMock";

// eslint-disable-next-line no-var
var revalidatePath: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var supabase: SupabaseAdminMock;
// eslint-disable-next-line no-var
var getCampaignForUser: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var getAIClient: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var getDefaultOpenRouterModel: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var trackAICall: ReturnType<typeof vi.fn>;

vi.mock("next/cache", () => {
  revalidatePath = vi.fn();
  return { revalidatePath };
});
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => supabase.client,
}));
vi.mock("@/app/(app)/dashboard/campaigns/actions", () => ({
  getCampaignForUser: (getCampaignForUser = vi.fn()),
}));
vi.mock("@/lib/ai/client", () => ({
  getAIClient: (getAIClient = vi.fn()),
  getDefaultOpenRouterModel: (getDefaultOpenRouterModel = vi.fn()),
}));
vi.mock("@/lib/ai/trackAICall", () => ({
  trackAICall: (trackAICall = vi.fn()),
}));

import { generateSessionSummary, updateSessionSummaryJson } from "./summary-actions";

function queue(table: "sessions" | "encounters", ...responses: SupabaseResponse[]) {
  supabase.queueResponse(table, ...responses);
}

function setAICompletion(payload: unknown) {
  const create = vi.fn().mockResolvedValue(payload);
  getAIClient.mockReturnValue({ chat: { completions: { create } } });
  return { create };
}

const VALID_SUMMARY = {
  events: [{ type: "decision", description: "The party accepted the quest." }],
  npcs_encountered: [
    { name: "Gorim", role: "blacksmith", relationship: "ally" },
  ],
  loot_gained: [{ item: "Gold", quantity: 10 }],
  decisions_made: [{ choice: "Headed to the old mine", consequence: "Time pressure increased" }],
  unresolved_threads: [
    { thread: "Who stole the relic?", last_mentioned: "End of session" },
  ],
  next_session_hooks: ["Return to town and interrogate the suspect"],
} as const;

describe("session summary server actions", () => {
  beforeEach(() => {
    supabase = createSupabaseAdminMock();
    revalidatePath.mockReset();
    getCampaignForUser.mockReset();
    getAIClient.mockReset();
    getDefaultOpenRouterModel.mockReset();
    trackAICall.mockReset();
    getDefaultOpenRouterModel.mockReturnValue("test-model");
    trackAICall.mockResolvedValue(undefined);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-03T04:05:06.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("generateSessionSummary success path stores summary_json", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1", dm_user_id: "user_1" });
    queue("sessions", { data: { id: "sess_1", campaign_id: "camp_1", notes_md: "# Notes" }, error: null });
    queue("encounters", { data: null, error: null });
    queue("sessions", { data: { id: "sess_1" }, error: null });

    setAICompletion({
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      choices: [
        {
          message: {
            tool_calls: [
              { function: { arguments: JSON.stringify(VALID_SUMMARY) } },
            ],
          },
        },
      ],
    });

    const res = await generateSessionSummary("camp_1", "sess_1");
    expect(res).toEqual({ ok: true, data: { summary: VALID_SUMMARY } });

    const updateQuery = supabase.queries.find(
      (q) => q.table === "sessions" && q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = updateQuery?.calls.find((c) => c.method === "update")?.args[0] as Record<
      string,
      unknown
    >;
    expect(updatePayload).toMatchObject({
      summary_json: VALID_SUMMARY,
      updated_at: "2025-02-03T04:05:06.000Z",
    });

    expect(trackAICall).toHaveBeenCalledTimes(1);
    expect(trackAICall).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkUserId: "user_1",
        feature: "session.summary",
        provider: "openrouter",
        model: "test-model",
        inputTokens: 10,
        outputTokens: 20,
        metadata: expect.objectContaining({
          campaignId: "camp_1",
          sessionId: "sess_1",
          usedTool: true,
          ok: true,
        }),
      }),
    );

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/campaigns/camp_1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/campaigns/camp_1/sessions");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/campaigns/camp_1/sessions/sess_1",
    );
  });

  it("generateSessionSummary invalid JSON from model returns ok:false", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1", dm_user_id: "user_1" });
    queue("sessions", { data: { id: "sess_1", campaign_id: "camp_1", notes_md: "# Notes" }, error: null });
    queue("encounters", { data: null, error: null });

    setAICompletion({
      choices: [
        { message: { tool_calls: [{ function: { arguments: "{not-json" } }] } },
      ],
    });

    const res = await generateSessionSummary("camp_1", "sess_1");
    expect(res).toEqual({ ok: false, error: "AI returned invalid JSON." });

    expect(supabase.queries.filter((q) => q.table === "sessions").length).toBe(1);
    expect(trackAICall).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ error: "invalid_json", usedTool: true }),
      }),
    );
  });

  it("generateSessionSummary schema mismatch returns ok:false", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1", dm_user_id: "user_1" });
    queue("sessions", { data: { id: "sess_1", campaign_id: "camp_1", notes_md: "# Notes" }, error: null });
    queue("encounters", { data: null, error: null });

    const bad = {
      ...VALID_SUMMARY,
      loot_gained: [{ item: "Gold", quantity: 0 }],
    };
    setAICompletion({
      choices: [
        { message: { tool_calls: [{ function: { arguments: JSON.stringify(bad) } }] } },
      ],
    });

    const res = await generateSessionSummary("camp_1", "sess_1");
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("unreachable");
    expect(res.error).toMatch(/did not match schema/i);

    expect(trackAICall).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ error: "schema_mismatch" }),
      }),
    );
  });

  it("updateSessionSummaryJson invalid JSON text returns ok:false", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1", dm_user_id: "user_1" });

    const res = await updateSessionSummaryJson("camp_1", "sess_1", "not json");
    expect(res).toEqual({ ok: false, error: "Invalid JSON." });
    expect(supabase.queries.length).toBe(0);
  });

  it("updateSessionSummaryJson valid JSON updates summary_json", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1", dm_user_id: "user_1" });
    queue("sessions", { data: { id: "sess_1" }, error: null });

    const res = await updateSessionSummaryJson(
      "camp_1",
      "sess_1",
      JSON.stringify(VALID_SUMMARY),
    );
    expect(res).toEqual({ ok: true, data: { summary: VALID_SUMMARY } });

    const updateQuery = supabase.queries.find(
      (q) => q.table === "sessions" && q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = updateQuery?.calls.find((c) => c.method === "update")?.args[0] as Record<
      string,
      unknown
    >;
    expect(updatePayload).toMatchObject({
      summary_json: VALID_SUMMARY,
      updated_at: "2025-02-03T04:05:06.000Z",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/campaigns/camp_1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/campaigns/camp_1/sessions");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/campaigns/camp_1/sessions/sess_1",
    );
  });
});
