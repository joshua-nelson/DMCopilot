import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSupabaseAdminMock,
  getQueryCalls,
  hasEqCall,
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
var setSessionPhase: ReturnType<typeof vi.fn>;

vi.mock("next/cache", () => {
  revalidatePath = vi.fn();
  return { revalidatePath };
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => {
  throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), { url });
} }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => supabase.client,
}));
vi.mock("@/app/(app)/dashboard/campaigns/actions", () => ({
  getCampaignForUser: (getCampaignForUser = vi.fn()),
}));
vi.mock("@/app/(app)/dashboard/campaigns/[campaignId]/sessions/actions", () => ({
  setSessionPhase: (setSessionPhase = vi.fn()),
}));

import {
  adjustCharacterHp,
  endEncounter,
  getEncounter,
  listEncounters,
  moveParticipant,
  nextTurn,
  setActiveTurn,
  setCharacterHp,
  setParticipantConditions,
  startEncounter,
  updateParticipantInitiative,
} from "./actions";

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return (value as unknown[]) ?? [];
}

function queue(table: "sessions" | "encounters" | "characters", ...responses: SupabaseResponse[]) {
  supabase.queueResponse(table, ...responses);
}

describe("encounters server actions", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    supabase = createSupabaseAdminMock();
    getCampaignForUser.mockReset();
    setSessionPhase.mockReset();
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    setSessionPhase.mockResolvedValue({ ok: true, data: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listEncounters verifies campaign+session and scopes by campaign_id + session_id", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", { data: [], error: null });

    await listEncounters("camp_1", "sess_1");
    expect(hasEqCall(supabase, "sessions", "id", "sess_1")).toBe(true);
    expect(hasEqCall(supabase, "sessions", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "session_id", "sess_1")).toBe(true);
  });

  it("getEncounter parses participants JSON and joins character hp/ac", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", {
      data: {
        id: "enc_1",
        campaign_id: "camp_1",
        session_id: "sess_1",
        participants: [
          { character_id: "char_a", name: "Alice", initiative: 15, conditions: [" prone ", "", 1] },
          { character_id: "char_b", name: "Bob", initiative: 10, conditions: [] },
        ],
      },
      error: null,
    });
    queue("characters", {
      data: [
        { id: "char_a", hp_current: 7, hp_max: 10, ac: 14 },
        { id: "char_b", hp_current: null, hp_max: null, ac: 12 },
      ],
      error: null,
    });

    const res = await getEncounter("camp_1", "sess_1", "enc_1");
    expect(res?.encounter.id).toBe("enc_1");
    expect(res?.participants).toEqual([
      {
        character_id: "char_a",
        name: "Alice",
        initiative: 15,
        conditions: ["prone"],
        hp_current: 7,
        hp_max: 10,
        ac: 14,
      },
      {
        character_id: "char_b",
        name: "Bob",
        initiative: 10,
        conditions: [],
        hp_current: null,
        hp_max: null,
        ac: 12,
      },
    ]);

    expect(hasEqCall(supabase, "encounters", "id", "enc_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "session_id", "sess_1")).toBe(true);
    expect(hasEqCall(supabase, "characters", "campaign_id", "camp_1")).toBe(true);
  });

  it("startEncounter rejects empty participants", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    const res = await startEncounter("camp_1", "sess_1", { characterIds: [] });
    expect(res).toEqual({ ok: false, error: "Select at least one participant." });
  });

  it("startEncounter prevents multiple active encounters", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", { data: { id: "enc_active" }, error: null });

    const res = await startEncounter("camp_1", "sess_1", { characterIds: ["char_a"] });
    expect(res).toEqual({
      ok: false,
      error: "An active encounter already exists for this session.",
    });
  });

  it("startEncounter rolls initiatives, sorts participants, and inserts scoped encounter", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // rollD20 => 1

    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue(
      "encounters",
      { data: null, error: null }, // existing active check
      { data: { id: "enc_1" }, error: null }, // insert
    );
    queue("characters", {
      data: [
        { id: "char_a", name: "Zed", initiative_bonus: 3 },
        { id: "char_b", name: "Alice", initiative_bonus: 0 },
      ],
      error: null,
    });

    setSessionPhase.mockRejectedValueOnce(new Error("ignore"));

    const res = await startEncounter("camp_1", "sess_1", {
      characterIds: ["char_a", "char_b"],
      initiatives: { char_b: 20 },
    });
    expect(res).toEqual({ ok: true, data: { encounterId: "enc_1" } });

    const insertQuery = supabase.queries.find(
      (q) => q.table === "encounters" && q.calls.some((c) => c.method === "insert"),
    );
    const insertPayload = asRecord(
      insertQuery?.calls.find((c) => c.method === "insert")?.args[0],
    );
    expect(insertPayload).toMatchObject({
      campaign_id: "camp_1",
      session_id: "sess_1",
      status: "active",
      round: 1,
      active_turn_idx: 0,
    });
    // Sorted: char_b (20) first, then char_a (1+3=4)
    const insertedParticipants = asArray(insertPayload.participants).map((p) => {
      const rec = asRecord(p);
      return {
        id: rec.character_id as string,
        init: rec.initiative as number,
      };
    });
    expect(insertedParticipants).toEqual([
      { id: "char_b", init: 20 },
      { id: "char_a", init: 4 },
    ]);

    expect(setSessionPhase).toHaveBeenCalledWith("camp_1", "sess_1", "combat");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/campaigns/camp_1/sessions/sess_1",
    );
  });

  it("setActiveTurn clamps active_turn_idx within participant bounds", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", { data: { participants: [
      { character_id: "a", name: "A", initiative: 10, conditions: [] },
      { character_id: "b", name: "B", initiative: 9, conditions: [] },
      { character_id: "c", name: "C", initiative: 8, conditions: [] },
    ] }, error: null });
    queue("encounters", { data: { id: "enc_1" }, error: null });

    const res = await setActiveTurn("camp_1", "sess_1", "enc_1", 99);
    expect(res).toEqual({ ok: true, data: null });

    const updateQuery = getQueryCalls(supabase, "encounters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    expect(updatePayload.active_turn_idx).toBe(2);
  });

  it("nextTurn wraps active turn and increments round", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", {
      data: {
        participants: [
          { character_id: "a", name: "A", initiative: 10, conditions: [] },
          { character_id: "b", name: "B", initiative: 9, conditions: [] },
        ],
        round: 3,
        active_turn_idx: 1,
      },
      error: null,
    });
    queue("encounters", { data: { id: "enc_1" }, error: null });

    const res = await nextTurn("camp_1", "sess_1", "enc_1");
    expect(res).toEqual({ ok: true, data: null });

    const updateQuery = getQueryCalls(supabase, "encounters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    expect(updatePayload).toMatchObject({ active_turn_idx: 0, round: 4 });
  });

  it("updateParticipantInitiative resorts and preserves active participant by id", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", {
      data: {
        participants: [
          { character_id: "a", name: "A", initiative: 10, conditions: [] },
          { character_id: "b", name: "B", initiative: 9, conditions: [] },
          { character_id: "c", name: "C", initiative: 8, conditions: [] },
        ],
        active_turn_idx: 1, // active is "b"
      },
      error: null,
    });
    queue("encounters", { data: { id: "enc_1" }, error: null });

    const res = await updateParticipantInitiative("camp_1", "sess_1", "enc_1", "c", 20);
    expect(res).toEqual({ ok: true, data: null });

    const updateQuery = getQueryCalls(supabase, "encounters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    const participantIds = asArray(updatePayload.participants).map((p) => asRecord(p).character_id);
    expect(participantIds).toEqual(["c", "a", "b"]);
    // active was "b" and should remain active; now index is 2
    expect(updatePayload.active_turn_idx).toBe(2);
  });

  it("moveParticipant swaps participants and preserves active participant by id", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", {
      data: {
        participants: [
          { character_id: "a", name: "A", initiative: 10, conditions: [] },
          { character_id: "b", name: "B", initiative: 9, conditions: [] },
          { character_id: "c", name: "C", initiative: 8, conditions: [] },
        ],
        active_turn_idx: 0, // active is "a"
      },
      error: null,
    });
    queue("encounters", { data: { id: "enc_1" }, error: null });

    const res = await moveParticipant("camp_1", "sess_1", "enc_1", "c", "up");
    expect(res).toEqual({ ok: true, data: null });

    const updateQuery = getQueryCalls(supabase, "encounters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    const participantIds = asArray(updatePayload.participants).map((p) => asRecord(p).character_id);
    expect(participantIds).toEqual(["a", "c", "b"]);
    expect(updatePayload.active_turn_idx).toBe(0);
  });

  it("setParticipantConditions trims/filters conditions and scopes encounter update", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", {
      data: {
        participants: [
          { character_id: "a", name: "A", initiative: 10, conditions: [] },
          { character_id: "b", name: "B", initiative: 9, conditions: ["old"] },
        ],
      },
      error: null,
    });
    queue("encounters", { data: { id: "enc_1" }, error: null });

    const res = await setParticipantConditions("camp_1", "sess_1", "enc_1", "b", [
      " poisoned ",
      "",
      "  ",
      "blinded",
    ]);
    expect(res).toEqual({ ok: true, data: null });

    expect(hasEqCall(supabase, "encounters", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "session_id", "sess_1")).toBe(true);

    const updateQuery = getQueryCalls(supabase, "encounters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    const b = asArray(updatePayload.participants)
      .map((p) => asRecord(p))
      .find((p) => p.character_id === "b");
    expect(b?.conditions).toEqual(["poisoned", "blinded"]);
  });

  it("adjustCharacterHp clamps between 0 and max and scopes by campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queue("characters", { data: { hp_current: 5, hp_max: 10 }, error: null });
    queue("characters", { data: { id: "char_1" }, error: null });

    const res = await adjustCharacterHp("camp_1", "char_1", 999);
    expect(res).toEqual({ ok: true, data: null });
    expect(hasEqCall(supabase, "characters", "id", "char_1")).toBe(true);
    expect(hasEqCall(supabase, "characters", "campaign_id", "camp_1")).toBe(true);

    const updateQuery = getQueryCalls(supabase, "characters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    expect(updatePayload.hp_current).toBe(10);
  });

  it("setCharacterHp clamps to max and scopes by campaign_id", async () => {
    getCampaignForUser.mockResolvedValue({ id: "camp_1" });
    queue("characters", { data: { hp_max: 10 }, error: null });
    queue("characters", { data: { id: "char_1" }, error: null });

    const res = await setCharacterHp("camp_1", "char_1", 50);
    expect(res).toEqual({ ok: true, data: null });

    const updateQuery = getQueryCalls(supabase, "characters").find((q) =>
      q.calls.some((c) => c.method === "update"),
    );
    const updatePayload = asRecord(updateQuery?.calls.find((c) => c.method === "update")?.args[0]);
    expect(updatePayload.hp_current).toBe(10);
  });

  it("endEncounter scopes update by id + campaign_id + session_id", async () => {
    queue("sessions", { data: { id: "sess_1" }, error: null });
    queue("encounters", { data: { id: "enc_1" }, error: null });

    const res = await endEncounter("camp_1", "sess_1", "enc_1");
    expect(res).toEqual({ ok: true, data: null });
    expect(hasEqCall(supabase, "encounters", "id", "enc_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "campaign_id", "camp_1")).toBe(true);
    expect(hasEqCall(supabase, "encounters", "session_id", "sess_1")).toBe(true);
  });
});
